import { useMemo, useState, type FormEvent } from 'react';
import { RiCloseLine } from '@remixicon/react';
import {
  QuestionnaireFields,
  useCreateResource,
  useQuestionnaireFormState,
  useResource,
  useSearch,
  useStatusBar,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import type { Bundle, Location } from '@medplum/fhirtypes';
import { Button, Drawer, ErrorState, IconButton, Spinner } from '../../components/ui';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import { useWriteAudit } from '../audit/useWriteAudit';
import { toErrorMessage } from '../sdc/toErrorMessage';
import {
  LOCATION_LINK_IDS,
  locationBodyFromAnswers,
  parentLocationIdFromAnswer,
} from '../sdc/resourceFromAnswers';

const FORM_ID = 'location-edit-form';

export interface LocationEditDrawerProps {
  nodeId: string;
  onClose: () => void;
  /** Called after a successful save so the page can refetch the hierarchy. */
  onSaved: () => void;
}

/**
 * SDC questionnaire-driven edit in a drawer. Writes go through the standard FHIR Location PUT
 * (useUpdateResource) — the read-only /api/location-hierarchy endpoint is never written to.
 */
export function LocationEditDrawer({ nodeId, onClose, onSaved }: Readonly<LocationEditDrawerProps>): React.ReactElement {
  const { t } = useTranslation();
  const statusBar = useStatusBar();
  const writeAudit = useWriteAudit();
  const updateLoc = useUpdateResource('Location');
  const createQr = useCreateResource('QuestionnaireResponse');

  const self = useResource('Location', nodeId);
  const current = self.data as Location | undefined;
  const all = useSearch('Location', { _count: '500' });
  const locList = useMemo(
    () =>
      ((all.data as Bundle<Location> | undefined)?.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is Location => Boolean(r?.id)),
    [all.data],
  );

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
      .map((l) => ({ value: `Location/${l.id as string}`, label: l.name ?? (l.id as string) }));
    return [root, ...rest];
  }, [locList, nodeId, t]);

  const referenceOptionsByLinkId = useMemo(
    () => ({ [LOCATION_LINK_IDS.parent]: parentOptions }),
    [parentOptions],
  );

  const onSave = (e: FormEvent): void => {
    e.preventDefault();
    setFormError(null);

    if (validateRequired().length > 0) {
      setFormError(t('questionnaireRequiredFields'));
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
        await updateLoc.mutateAsync({ id: nodeId, body: { ...(current ?? {}), ...locationBodyFromAnswers(answers) } });
        await writeAudit({ action: 'update', resourceType: 'Location', resourceId: nodeId });
        await createQr.mutateAsync(buildQuestionnaireResponse());
        await writeAudit({ action: 'create', resourceType: 'QuestionnaireResponse' });
        statusBar.notify({ tone: 'success', title: t('locationSaved') });
        onSaved();
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
        <div style={{ padding: 'var(--ohs-spacing-6, 32px)' }}>
          <Spinner label={t('loading')} />
        </div>
      ) : (
        <form id={FORM_ID} className="ohs-detail-body" onSubmit={onSave}>
          {formError ? <ErrorState description={formError} /> : null}
          <QuestionnaireFields
            questionnaire={questionnaire}
            answers={answers}
            setAnswer={setAnswer}
            referenceOptionsByLinkId={referenceOptionsByLinkId}
          />
        </form>
      )}
    </Drawer>
  );
}
