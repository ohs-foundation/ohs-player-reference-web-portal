import { useRef, useState, type DragEvent } from 'react';
import { RiUploadCloud2Line, RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { Button, Drawer, IconButton, LinearProgress } from '../../components/ui';
import { RiCloseLine } from '@remixicon/react';
import { useBulkImport } from './useBulkImport';

const FORM_ID = 'location-import-form';

const EXPECTED_COLUMNS: { key: string; required?: boolean }[] = [
  { key: 'name', required: true },
  { key: 'id' },
  { key: 'physical_type' },
  { key: 'level' },
  { key: 'latitude' },
  { key: 'longitude' },
  { key: 'source_id' },
  { key: 'parent_id' },
  { key: 'source_parent_id' },
  { key: 'org_id' },
  { key: 'source_org_id' },
];

export interface LocationImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function LocationImportDrawer({ open, onClose, onComplete }: Readonly<LocationImportDrawerProps>): React.ReactElement {
  const { t } = useTranslation();
  const { phase, progress, result, error, start, reset } = useBulkImport();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    reset();
    setFile(null);
    onClose();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) void start(file).then(() => onComplete());
  };

  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-text">{t('locationsImportTitle')}</h2>
        <p className="text-sm text-text-muted">{t('locationsImportSubtitle')}</p>
      </div>
      <IconButton label={t('close')} onClick={close}>
        <RiCloseLine size={20} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="flex gap-3">
      <Button variant="outlined" type="button" onClick={close} style={{ flex: 1 }}>
        {t('cancel')}
      </Button>
      <Button
        type="submit"
        form={FORM_ID}
        loading={phase === 'uploading'}
        disabled={!file || phase === 'uploading'}
        style={{ flex: 1 }}
      >
        {t('locationsStartImport')}
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={close} title={t('locationsImportTitle')} header={header} footer={footer}>
      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-5 p-5">
        {phase === 'idle' || phase === 'error' ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center gap-2 rounded border-2 border-dashed p-8 text-center outline-none
                focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]
                ${dragging ? 'border-primary bg-primary-container' : 'border-border-tertiary'}`}
            >
              <RiUploadCloud2Line size={32} className="text-text-muted" />
              <span className="text-sm text-text">{file ? file.name : t('locationsDropzone')}</span>
              <span className="text-xs text-text-muted">{t('locationsDropzoneHint')}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <div className="rounded border border-border p-4">
              <div className="mb-2 text-sm font-medium text-text">{t('locationsExpectedColumns')}</div>
              <div className="flex flex-wrap gap-2">
                {EXPECTED_COLUMNS.map((c) => (
                  <span
                    key={c.key}
                    className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-xs
                      ${c.required ? 'border-primary bg-primary-container text-primary' : 'border-border-tertiary text-text-muted'}`}
                  >
                    {c.key}
                    {c.required ? '*' : ''}
                  </span>
                ))}
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-error">
                <RiErrorWarningFill size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {phase === 'uploading' ? (
          <div className="flex flex-col gap-2">
            <LinearProgress indeterminate={progress.total === 0} value={progress.processed} max={progress.total || 100} />
            <span className="text-sm text-text-muted">
              {t('locationsImportProgress', { processed: progress.processed, total: progress.total, pct })}
            </span>
          </div>
        ) : null}

        {phase === 'success' && result ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-text">
              {result.failed > 0 ? (
                <RiErrorWarningFill size={22} className="text-warning" />
              ) : (
                <RiCheckboxCircleFill size={22} className="text-positive" />
              )}
              <span className="text-base font-semibold">
                {result.failed > 0 ? t('locationsImportPartial') : t('locationsImportComplete')}
              </span>
            </div>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('locationsImportTotal')}</dt>
                <dd className="text-text">{result.total}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('locationsImportProcessed')}</dt>
                <dd className="text-text">{result.processed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('locationsImportFailed')}</dt>
                <dd className={result.failed > 0 ? 'text-error' : 'text-text'}>{result.failed}</dd>
              </div>
            </dl>
            {result.failed > 0 ? (
              <p className="rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-text-muted">
                {t('locationsImportFailedNotice', { failed: result.failed })}
              </p>
            ) : null}
            <Button type="button" onClick={close}>
              {t('done')}
            </Button>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}
