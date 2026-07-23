import { useState } from 'react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  useCreateResource,
  useRefreshResources,
  useStatusBar,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import { RiCloseLine, RiMagicLine } from '@remixicon/react';
import { Button, IconButton, TextAreaField } from '../../components/ui';
import { Drawer } from '../../components/ui/Drawer';
import { useWriteAudit } from '../audit/useWriteAudit';
import { type FhirRecord, type ResourceTypeDef } from './registry';
import { exampleFor } from './examples';
import { newResourceId } from './ids';

interface AddResourceDrawerProps {
  def: ResourceTypeDef;
  open: boolean;
  onClose: () => void;
}

type Parsed = { ok: true; resource: FhirRecord } | { ok: false; errorKey: string };

/** Parse the draft and check it is a JSON object of the expected resource type. */
function parseDraft(text: string, resourceType: string): Parsed {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, errorKey: 'fhirViewerAddInvalidJson' };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errorKey: 'fhirViewerAddNotAnObject' };
  }
  const resource = value as FhirRecord;
  if (resource.resourceType !== resourceType) {
    return { ok: false, errorKey: 'fhirViewerAddTypeMismatch' };
  }
  return { ok: true, resource };
}

/**
 * Create a resource from pasted JSON. "Quick resource add" fills the field with the bundled example
 * plus a freshly generated id; the user still reviews and clicks Add. A resource carrying an `id` is
 * PUT (created at that id), otherwise it is POSTed and the server assigns one.
 */
export function AddResourceDrawer({
  def,
  open,
  onClose,
}: Readonly<AddResourceDrawerProps>): React.ReactElement {
  const { t } = useTranslation();
  const status = useStatusBar();
  const writeAudit = useWriteAudit();
  const refresh = useRefreshResources();
  const create = useCreateResource(def.resourceType);
  const update = useUpdateResource(def.resourceType);

  const [text, setText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const typeLabel = t(def.labelKey);
  const parsed = text.trim() ? parseDraft(text, def.resourceType) : undefined;
  const validationError = parsed && !parsed.ok ? t(parsed.errorKey, { type: def.resourceType }) : null;
  const canSubmit = parsed?.ok === true && !create.isPending && !update.isPending;
  const pending = create.isPending || update.isPending;

  const fillTemplate = (): void => {
    const example = exampleFor(def.resourceType);
    if (!example) return;
    setSubmitError(null);
    setText(JSON.stringify({ ...example, id: newResourceId() }, null, 2));
  };

  const close = (): void => {
    setText('');
    setSubmitError(null);
    onClose();
  };

  const submit = async (): Promise<void> => {
    if (!parsed?.ok) return;
    setSubmitError(null);
    const resource = parsed.resource;
    const id = typeof resource.id === 'string' && resource.id ? resource.id : undefined;
    try {
      const created = id
        ? await update.mutateAsync({ id, body: resource })
        : await create.mutateAsync(resource);
      const resourceId = id ?? (created as { id?: string } | undefined)?.id;
      if (!resourceId) throw new Error('Create did not return an id');

      await writeAudit({ action: 'create', resourceType: def.resourceType, resourceId });
      status.notify({ tone: 'success', title: t('fhirViewerAdded', { type: typeLabel }) });
      await refresh(def.resourceType);
      close();
    } catch (e) {
      const message =
        e instanceof FhirError
          ? formatOperationOutcomeMessage(e.outcome) || e.message
          : e instanceof Error
            ? e.message
            : t('fhirViewerAddFailed');
      setSubmitError(message);
      status.notify({ tone: 'error', title: t('fhirViewerAddFailed'), description: message });
    }
  };

  const header = (
    <div className="flex items-start justify-between gap-4 px-8 py-6 border-b border-border">
      <div className="min-w-0">
        <p className="m-0 text-xl font-medium text-text truncate">
          {t('fhirViewerAddTitle', { type: typeLabel })}
        </p>
        <p className="m-0 mt-1 text-sm text-text-muted">{t('fhirViewerAddSubtitle')}</p>
      </div>
      <IconButton label={t('close')} onClick={close}>
        <RiCloseLine size={20} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" onClick={close} disabled={pending}>
        {t('fhirViewerCancel')}
      </Button>
      <Button variant="primary" onClick={() => void submit()} loading={pending} disabled={!canSubmit}>
        {t('fhirViewerAddSubmit')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t('fhirViewerAddTitle', { type: typeLabel })}
      header={header}
      footer={footer}
    >
      <div className="flex flex-col h-full min-w-0 p-6 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outlined"
            iconLeft={<RiMagicLine size={18} aria-hidden="true" />}
            onClick={fillTemplate}
          >
            {t('fhirViewerQuickAdd')}
          </Button>
          <p className="m-0 text-sm text-text-muted">
            {t('fhirViewerQuickAddHint', { type: typeLabel })}
          </p>
        </div>

        <TextAreaField
          label={t('fhirViewerJsonLabel')}
          instructions={t('fhirViewerAddIdHint')}
          error={validationError ?? submitError ?? undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSubmitError(null);
          }}
          spellCheck={false}
          placeholder={t('fhirViewerAddPlaceholder', { type: def.resourceType })}
          className="flex-1 min-h-[360px] font-mono text-sm leading-relaxed"
        />
      </div>
    </Drawer>
  );
}
