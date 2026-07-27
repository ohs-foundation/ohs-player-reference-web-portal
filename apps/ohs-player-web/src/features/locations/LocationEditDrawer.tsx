import { useMemo, useState, type FormEvent } from 'react';
import { RiCloseLine, RiInformationLine } from '@remixicon/react';
import {
  useCreateResource,
  useQuestionnaireFormState,
  useResource,
  useStatusBar,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import type { Location } from '@medplum/fhirtypes';
import { Button, Combobox, Drawer, ErrorState, IconButton, Spinner, Stack } from '../../components/ui';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import { useWriteAudit } from '../audit/useWriteAudit';
import { toErrorMessage } from '../sdc/toErrorMessage';
import { RadioRow, Section, StackedInput, StackedSelect } from '../users/userFormControls';
import {
  LOCATION_LINK_IDS,
  locationBodyFromAnswers,
  parentLocationIdFromAnswer,
} from '../sdc/resourceFromAnswers';
import type { LocationEditPatch } from './hierarchy';
import { useAllLocationsLean } from './useLocationRoots';

const FORM_ID = 'location-edit-form';

/** Option codes mirror the location questionnaire's answerOptions — the link-id contract is unchanged. */
const STATUS_OPTIONS = [
  { value: 'active', labelKey: 'locationStatusActive' },
  { value: 'suspended', labelKey: 'locationStatusSuspended' },
  { value: 'inactive', labelKey: 'locationStatusInactive' },
] as const;
const MODE_OPTIONS = [
  { value: 'instance', labelKey: 'locationsModeInstance' },
  { value: 'kind', labelKey: 'locationsModeKind' },
] as const;

export interface LocationEditDrawerProps {
  nodeId: string;
  onClose: () => void;
  /** Receives the saved values so the caller can mirror them into the cached tree. */
  onSaved: (patch: LocationEditPatch) => void;
}

/** Writes via the FHIR Location PUT — the read-only hierarchy endpoint is never written to. */
export function LocationEditDrawer({ nodeId, onClose, onSaved }: Readonly<LocationEditDrawerProps>): React.ReactElement {
  const { t } = useTranslation();
  const statusBar = useStatusBar();
  const writeAudit = useWriteAudit();
  const updateLoc = useUpdateResource('Location');
  const createQr = useCreateResource('QuestionnaireResponse');

  const self = useResource('Location', nodeId);
  const current = self.data as Location | undefined;
  // Full paginated lean list — a single `_count: 500` page drops parents under large imports.
  const all = useAllLocationsLean(true);
  const locList = useMemo(() => all.data ?? [], [all.data]);

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const questionnaire = getBundledQuestionnaires().location;

  const initialAnswers = useMemo((): Record<string, string> | undefined => {
    if (!current) return undefined;
    return {
      [LOCATION_LINK_IDS.name]: current.name ?? '',
      [LOCATION_LINK_IDS.status]: current.status ?? 'active',
      [LOCATION_LINK_IDS.mode]: current.mode ?? 'instance',
      [LOCATION_LINK_IDS.addressLine]: current.address?.text ?? '',
      [LOCATION_LINK_IDS.parent]: current.partOf?.reference ?? '__root__',
    };
  }, [current]);

  const { answers, setAnswer, validateRequired, buildQuestionnaireResponse } = useQuestionnaireFormState(
    questionnaire,
    initialAnswers,
  );

  const wouldCycle = (targetParentId: string | undefined): boolean => {
    if (!targetParentId) return false;
    let cur: string | undefined = targetParentId;
    const seen = new Set<string>();
    while (cur) {
      if (cur === nodeId) return true;
      if (seen.has(cur)) break;
      seen.add(cur);
      const node = locList.find((x) => x.id === cur);
      cur = node?.partOf?.reference?.replace('Location/', '');
    }
    return false;
  };

  const parentOptions = useMemo(() => {
    const root = { value: '__root__', label: t('rootLocation') };
    const rest = locList
      .filter((l) => l.id !== nodeId)
      .map((l) => ({
        value: `Location/${l.id as string}`,
        label: l.name?.trim() ? l.name : (l.id as string),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return [root, ...rest];
  }, [locList, nodeId, t]);

  const [nameError, setNameError] = useState<string | null>(null);

  const onSave = (e: FormEvent): void => {
    e.preventDefault();
    setFormError(null);
    setNameError(null);

    const missing = validateRequired();
    if (missing.length > 0) {
      if (missing.includes(LOCATION_LINK_IDS.name)) setNameError(t('questionnaireRequiredFields'));
      else setFormError(t('questionnaireRequiredFields'));
      return;
    }
    const parentId = parentLocationIdFromAnswer(answers[LOCATION_LINK_IDS.parent]);
    if (wouldCycle(parentId)) {
      setFormError(t('circularReferenceBlocked'));
      return;
    }

    void (async () => {
      setSaving(true);
      try {
        // Spreading a body that omits `partOf` would leave the previous parent on the resource.
        const fields = locationBodyFromAnswers(answers);
        const body: Location = { ...(current ?? { resourceType: 'Location' }), ...fields };
        if (!fields.partOf) {
          delete body.partOf;
        }
        await updateLoc.mutateAsync({ id: nodeId, body });
        await writeAudit({ action: 'update', resourceType: 'Location', resourceId: nodeId });
        await createQr.mutateAsync(buildQuestionnaireResponse());
        await writeAudit({ action: 'create', resourceType: 'QuestionnaireResponse' });
        statusBar.notify({ tone: 'success', title: t('locationSaved') });
        onSaved({ id: nodeId, name: fields.name, status: fields.status, parentId: parentId ?? null });
        onClose();
      } catch (err) {
        setFormError(toErrorMessage(err));
      } finally {
        setSaving(false);
      }
    })();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('pageLocationEdit')}</h2>
        {current?.name ? <p className="ohs-form-drawer__subtitle">{current.name}</p> : null}
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={onClose} disabled={saving} style={{ flex: 1 }}>
        {t('cancel')}
      </Button>
      <Button type="submit" form={FORM_ID} loading={saving} disabled={saving || !current} style={{ flex: 1 }}>
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('pageLocationEdit')} header={header} footer={footer}>
      {self.isLoading ? (
        <div style={{ padding: 'var(--ohs-sys-spacing-8, 32px)' }}>
          <Spinner label={t('loading')} />
        </div>
      ) : (
        <form id={FORM_ID} className="ohs-detail-body" onSubmit={onSave}>
          {formError ? <ErrorState description={formError} /> : null}
          <Section icon={RiInformationLine} title={t('sectionBasicInfo')}>
            <Stack gap={5}>
              <div className="ohs-detail-grid">
                <StackedInput
                  full
                  required
                  label={t('locationName')}
                  value={answers[LOCATION_LINK_IDS.name] ?? ''}
                  error={nameError ?? undefined}
                  onChange={(v) => {
                    setAnswer(LOCATION_LINK_IDS.name, v);
                    setNameError(null);
                  }}
                />
                <RadioRow
                  label={t('columnStatus')}
                  name="location-status"
                  value={answers[LOCATION_LINK_IDS.status] ?? 'active'}
                  onChange={(v) => setAnswer(LOCATION_LINK_IDS.status, v)}
                  options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                />
                <StackedInput
                  full
                  label={t('locationsAddressLine')}
                  value={answers[LOCATION_LINK_IDS.addressLine] ?? ''}
                  onChange={(v) => setAnswer(LOCATION_LINK_IDS.addressLine, v)}
                />
                <StackedSelect
                  label={t('locationsMode')}
                  value={answers[LOCATION_LINK_IDS.mode] ?? 'instance'}
                  onChange={(v) => setAnswer(LOCATION_LINK_IDS.mode, v)}
                  options={MODE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                  placeholder={t('selectPlaceholder')}
                />
                <Combobox
                  full
                  label={t('locationsParentLocation')}
                  value={answers[LOCATION_LINK_IDS.parent] ?? '__root__'}
                  onChange={(v) => setAnswer(LOCATION_LINK_IDS.parent, v || '__root__')}
                  options={parentOptions}
                  placeholder={t('locationsParentSearch')}
                />
              </div>
            </Stack>
          </Section>
        </form>
      )}
    </Drawer>
  );
}
