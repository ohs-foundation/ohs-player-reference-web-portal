import { useState } from 'react';
import {
  FhirError,
  FhirJsonEditor,
  FhirJsonView,
  formatOperationOutcomeMessage,
  OhsDialog,
  useDeleteResource,
  usePermission,
  useRefreshResources,
  useResource,
  useStatusBar,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import { RiCloseLine, RiDeleteBinLine, RiPencilLine } from '@remixicon/react';
import { Avatar, Button, ErrorState, IconButton, LinearProgress } from '../../components/ui';
import { Drawer } from '../../components/ui/Drawer';
import { useWriteAudit } from '../audit/useWriteAudit';
import { type FhirRecord, type ResourceTypeDef, displayNameFor } from './registry';

interface ResourceDrawerProps {
  def: ResourceTypeDef;
  resourceId: string;
  open: boolean;
  onClose: () => void;
  /**
   * Render this bundled example instead of reading from the server: read-only, no fetch, and no
   * edit/delete, because the resource does not exist on the server.
   */
  example?: FhirRecord;
}

function asRecord(value: unknown): FhirRecord {
  return value && typeof value === 'object' ? (value as FhirRecord) : {};
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome) || error.message;
  return error instanceof Error ? error.message : fallback;
}

/**
 * View / edit / delete drawer for one FHIR resource. Reads the resource fresh, shows pretty JSON with
 * Copy, and (for `fhir-viewer.edit` holders) a raw-JSON editor plus a hard delete. Delete and Save
 * confirm, write an AuditEvent, and refresh the list. This is a power-user/debug surface — raw JSON,
 * not the SDC/typed-form path other features use.
 */
export function ResourceDrawer({
  def,
  resourceId,
  open,
  onClose,
  example,
}: Readonly<ResourceDrawerProps>): React.ReactElement {
  const { t } = useTranslation();
  const status = useStatusBar();
  const writeAudit = useWriteAudit();
  const refresh = useRefreshResources();
  const update = useUpdateResource(def.resourceType);
  const del = useDeleteResource(def.resourceType);
  const isExample = example !== undefined;
  // Disabled query for the example: there is nothing to read from the server.
  const read = useResource(def.resourceType, isExample ? undefined : resourceId);
  const canEdit = usePermission('fhir-viewer.edit').can;

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [draft, setDraft] = useState<unknown>(null);
  const [dirty, setDirty] = useState(false);
  const [valid, setValid] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [conflict, setConflict] = useState(false);

  const resource = isExample ? example : read.data;
  const record = asRecord(resource);
  const typeLabel = t(def.labelKey);
  const title = displayNameFor(def, record);
  const metaVersion = asRecord(record.meta).versionId;
  const versionId = typeof metaVersion === 'string' ? metaVersion : String(read.dataUpdatedAt);

  const enterEdit = (): void => {
    setDraft(resource);
    setDirty(false);
    setValid(true);
    setConflict(false);
    setMode('edit');
  };

  const leaveEdit = (): void => {
    setMode('view');
    setDirty(false);
    setConflict(false);
  };

  const requestCancel = (): void => (dirty ? setConfirmDiscard(true) : leaveEdit());

  const save = async (): Promise<void> => {
    if (!valid || draft == null) return;
    setConflict(false);
    try {
      await update.mutateAsync({ id: resourceId, body: draft });
      await writeAudit({ action: 'update', resourceType: def.resourceType, resourceId });
      status.notify({ tone: 'success', title: t('fhirViewerSaved', { type: typeLabel }) });
      await refresh(def.resourceType);
      leaveEdit();
    } catch (e) {
      if (e instanceof FhirError && (e.status === 409 || e.status === 412)) {
        setConflict(true);
        return;
      }
      status.notify({
        tone: 'error',
        title: t('fhirViewerSaveFailed'),
        description: errorMessage(e, t('fhirViewerSaveFailed')),
      });
    }
  };

  const doDelete = async (): Promise<void> => {
    try {
      await del.mutateAsync(resourceId);
      await writeAudit({ action: 'delete', resourceType: def.resourceType, resourceId });
      status.notify({ tone: 'success', title: t('fhirViewerDeleted', { type: typeLabel }) });
      await refresh(def.resourceType);
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      setConfirmDelete(false);
      status.notify({
        tone: 'error',
        title: t('fhirViewerDeleteFailed'),
        description: errorMessage(e, t('fhirViewerDeleteFailed')),
      });
    }
  };

  const header = (
    <div className="flex items-start justify-between gap-4 px-8 py-6 border-b border-border">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={title || typeLabel} />
        <div className="min-w-0">
          <p className="m-0 text-xl font-medium text-text truncate">{title}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded border border-border-secondary text-sm text-text-muted font-mono">
            {typeLabel} · {resourceId}
          </span>
        </div>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={20} />
      </IconButton>
    </div>
  );

  const footer = isExample ? undefined : mode === 'edit' ? (
      <div className="ohs-user-drawer__foot">
        <Button variant="outlined" onClick={requestCancel} disabled={update.isPending}>
          {t('fhirViewerCancel')}
        </Button>
        <Button
          variant="primary"
          onClick={() => void save()}
          loading={update.isPending}
          disabled={!valid || !dirty || update.isPending}
        >
          {t('fhirViewerSave')}
        </Button>
      </div>
    ) : canEdit ? (
      <div className="ohs-user-drawer__foot">
        <Button
          variant="danger"
          iconLeft={<RiDeleteBinLine size={18} aria-hidden="true" />}
          aria-label={t('fhirViewerDelete', { type: typeLabel })}
          onClick={() => setConfirmDelete(true)}
        >
          {t('fhirViewerActionDelete')}
        </Button>
        <Button
          variant="primary"
          iconLeft={<RiPencilLine size={18} aria-hidden="true" />}
          aria-label={t('fhirViewerEdit', { type: typeLabel })}
          onClick={enterEdit}
        >
          {t('fhirViewerActionEdit')}
        </Button>
      </div>
    ) : undefined;

  return (
    <>
      <Drawer open={open} onClose={onClose} title={title || typeLabel} header={header} footer={footer}>
        <div className="flex flex-col h-full min-w-0 p-6 gap-4">
          {read.isLoading ? (
            <div className="flex-1 grid place-items-center">
              <LinearProgress label={t('loading')} />
            </div>
          ) : read.error ? (
            <div className="flex-1 grid place-items-center">
              <ErrorState description={errorMessage(read.error, t('fhirViewerDrawerLoadError'))} />
            </div>
          ) : mode === 'view' ? (
            <>
              {isExample ? (
                <p className="m-0 rounded border border-border bg-surface-variant p-3 text-sm text-text-muted">
                  {t('fhirViewerExampleNotice', { type: typeLabel })}
                </p>
              ) : null}
              <FhirJsonView
                className="flex-1 min-h-0 min-w-0"
                resource={resource}
                copyLabel={t('fhirViewerCopyCode')}
                copiedLabel={t('fhirViewerCopied')}
                onCopy={() => status.notify({ tone: 'success', title: t('fhirViewerCopiedToast') })}
                onCopyError={() => status.notify({ tone: 'error', title: t('fhirViewerCopyFailed') })}
              />
            </>
          ) : (
            <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-4">
              {conflict ? (
                <div className="rounded border border-border bg-surface-variant p-3 flex items-center justify-between gap-3">
                  <p className="m-0 text-sm text-text">{t('fhirViewerConflict')}</p>
                  <Button size="sm" variant="outlined" onClick={() => void read.refetch()}>
                    {t('fhirViewerReload')}
                  </Button>
                </div>
              ) : null}
              <FhirJsonEditor
                key={versionId}
                className="flex-1 min-h-0 min-w-0"
                value={resource}
                label={t('fhirViewerJsonLabel')}
                invalidJsonMessage={t('fhirViewerInvalidJson')}
                immutableFieldsMessage={t('fhirViewerImmutableFields')}
                onChange={(parsed) => {
                  setDraft(parsed);
                  setDirty(true);
                }}
                onValidityChange={setValid}
              />
            </div>
          )}
        </div>
      </Drawer>

      <OhsDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        headline={t('fhirViewerDeleteConfirmTitle', { type: typeLabel })}
        actions={
          <>
            <Button variant="outlined" onClick={() => setConfirmDelete(false)} disabled={del.isPending}>
              {t('fhirViewerCancel')}
            </Button>
            <Button variant="danger" onClick={() => void doDelete()} loading={del.isPending} disabled={del.isPending}>
              {t('fhirViewerDeleteConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('fhirViewerDeleteConfirmBody', { type: typeLabel, name: title || resourceId })}</p>
      </OhsDialog>

      <OhsDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        headline={t('fhirViewerDiscardEdit')}
        actions={
          <>
            <Button variant="outlined" onClick={() => setConfirmDiscard(false)}>
              {t('fhirViewerCancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDiscard(false);
                leaveEdit();
              }}
            >
              {t('fhirViewerDeleteConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('fhirViewerDiscardEdit')}</p>
      </OhsDialog>
    </>
  );
}
