import { useMemo, useState } from 'react';
import { IconClose } from '../../components/ui/icons';
import {
  bundleEntry,
  commitBundle,
  committedId,
  useFhirClient,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import { Drawer, ErrorState, IconButton } from '../../components/ui';
import { useWriteAudit } from '../audit/useWriteAudit';
import { locationBodyFromAnswers } from '../sdc/resourceFromAnswers';
import { toErrorMessage } from '../sdc/toErrorMessage';
import { LocationFormFields } from './LocationForm';
import { answersToDraftLocation } from './locationDraft';
import { useAllLocationsLean } from './useLocationRoots';

const FORM_ID = 'location-create-form';

/** Standalone create: commits a one-entry Location Bundle transaction. */
export function LocationCreateDrawer({
  onClose,
  onSuccess,
}: Readonly<{
  onClose: () => void;
  onSuccess: (created: { id: string; name: string }) => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const writeAudit = useWriteAudit();
  const statusBar = useStatusBar();
  const all = useAllLocationsLean(true);
  const locList = useMemo(() => all.data ?? [], [all.data]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo(() => {
    const root = { value: '__root__', label: t('rootLocation') };
    const rest = locList
      .filter((l) => l.id)
      .map((l) => ({
        value: `Location/${l.id as string}`,
        label: l.name?.trim() ? l.name : (l.id as string),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return [root, ...rest];
  }, [locList, t]);

  const submitAnswers = (answers: Record<string, string>): void => {
    if (saving) return;
    setError(null);
    void (async () => {
      setSaving(true);
      try {
        const draft = answersToDraftLocation(answers);
        const body = locationBodyFromAnswers(answers);
        const resource: Record<string, unknown> = { ...body };
        const result = await commitBundle(client, [
          bundleEntry({ method: 'POST', url: 'Location' }, resource),
        ]);
        const id = committedId(result, 0);
        if (!id) throw new Error('Create did not return an id');
        await writeAudit({ action: 'create', resourceType: 'Location', resourceId: id });
        statusBar.notify({ tone: 'success', title: t('locationCreated') });
        onSuccess({ id, name: draft.resource.name });
        onClose();
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setSaving(false);
      }
    })();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('dialogCreateLocation')}</h2>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('dialogCreateLocation')} header={header}>
      {error ? <ErrorState description={error} /> : null}
      {saving ? <p>{t('saving')}</p> : null}
      <LocationFormFields
        formId={FORM_ID}
        parentOptions={parentOptions}
        submitLabel={t('create')}
        onSubmit={submitAnswers}
      />
    </Drawer>
  );
}
