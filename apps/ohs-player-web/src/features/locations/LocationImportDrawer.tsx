import { useRef, useState, type DragEvent } from 'react';
import {
  IconCheckCircleFill,
  IconClose,
  IconDownload,
  IconErrorFill,
  IconFileList,
  IconUpload,
} from '../../components/ui/icons';
import { useTranslation } from 'ohs-player-web-core';
import { Button, Drawer, IconButton, LinearProgress, Stack } from '../../components/ui';
import { Section } from '../users/userFormControls';
import { useBulkImport, type ImportResult } from './useBulkImport';
import { downloadImportTemplate, EXPECTED_COLUMNS } from './importTemplate';

const FORM_ID = 'location-import-form';

function ColumnsSection(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Section icon={IconFileList} title={t('locationsExpectedColumns')}>
      <Stack gap={4}>
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
        <p className="m-0 text-xs text-text-muted">{t('locationsTemplateHint')}</p>
        <div>
          <Button variant="outlined" type="button" iconLeft={<IconDownload size={18} />} onClick={downloadImportTemplate}>
            {t('locationsDownloadTemplate')}
          </Button>
        </div>
      </Stack>
    </Section>
  );
}

function ProgressSection({ processed, total }: Readonly<{ processed: number; total: number }>): React.ReactElement {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <Section icon={IconUpload} title={t('locationsUploadFile')}>
      <Stack gap={3}>
        <LinearProgress indeterminate={total === 0} value={processed} max={total || 100} />
        <span className="text-sm text-text-muted">{t('locationsImportProgress', { processed, total, pct })}</span>
      </Stack>
    </Section>
  );
}

function ResultSection({ result }: Readonly<{ result: ImportResult }>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Section icon={IconUpload} title={t('locationsImportTitle')}>
      <Stack gap={4}>
        <div className="flex items-center gap-2 text-text">
          {result.failed > 0 ? (
            <IconErrorFill size={22} className="text-warning" />
          ) : (
            <IconCheckCircleFill size={22} className="text-positive" />
          )}
          <span className="text-base font-semibold">
            {result.failed > 0 ? t('locationsImportPartial') : t('locationsImportComplete')}
          </span>
        </div>
        <dl className="m-0 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">{t('locationsImportTotal')}</dt>
            <dd className="m-0 text-text">{result.total}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">{t('locationsImportProcessed')}</dt>
            <dd className="m-0 text-text">{result.processed}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">{t('locationsImportFailed')}</dt>
            <dd className={`m-0 ${result.failed > 0 ? 'text-error' : 'text-text'}`}>{result.failed}</dd>
          </div>
        </dl>
        {result.failed > 0 ? (
          <p className="m-0 rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-text-muted">
            {t('locationsImportFailedNotice', { failed: result.failed })}
          </p>
        ) : null}
      </Stack>
    </Section>
  );
}

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

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('locationsImportTitle')}</h2>
        <p className="ohs-form-drawer__subtitle">{t('locationsImportSubtitle')}</p>
      </div>
      <IconButton label={t('close')} onClick={close}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  const footer =
    phase === 'success' ? (
      <div className="ohs-user-drawer__foot">
        <Button type="button" onClick={close} style={{ flex: 1 }}>
          {t('done')}
        </Button>
      </div>
    ) : (
      <div className="ohs-user-drawer__foot">
        <Button variant="outlined" type="button" onClick={close} disabled={phase === 'uploading'} style={{ flex: 1 }}>
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
      <form id={FORM_ID} onSubmit={onSubmit} className="ohs-detail-body">
        {phase === 'idle' || phase === 'error' ? (
          <>
            <Section icon={IconUpload} title={t('locationsUploadFile')}>
              <Stack gap={4}>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`flex w-full flex-col items-center gap-2 rounded border-2 border-dashed p-8 text-center outline-none
                    focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]
                    ${dragging ? 'border-primary bg-primary-container' : 'border-outline hover:border-text-muted'}`}
                >
                  <IconUpload size={32} className="text-text-muted" />
                  <span className={`text-sm ${file ? 'font-medium text-primary' : 'text-text'}`}>
                    {file ? file.name : t('locationsDropzone')}
                  </span>
                  <span className="text-xs text-text-muted">{t('locationsDropzoneHint')}</span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {error ? (
                  <div className="flex items-start gap-2 rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-error">
                    <IconErrorFill size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
              </Stack>
            </Section>
            <ColumnsSection />
          </>
        ) : null}

        {phase === 'uploading' ? <ProgressSection processed={progress.processed} total={progress.total} /> : null}

        {phase === 'success' && result ? <ResultSection result={result} /> : null}
      </form>
    </Drawer>
  );
}
