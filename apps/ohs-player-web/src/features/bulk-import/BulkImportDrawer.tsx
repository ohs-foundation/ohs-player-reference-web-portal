import { useRef, useState, type DragEvent } from 'react';
import {
  IconClose,
  IconErrorFill,
  IconUpload,
  Button,
  Drawer,
  IconButton,
  Stack,
} from 'ohs-player-web-shell';
import { useTranslation } from 'ohs-player-web-core';
import { Section } from '../users/userFormControls';
import { useBulkImport } from './useBulkImport';
import { useImportAudit } from './useImportAudit';
import { importWroteRows, type RowError } from './importStream';
import { type ImportTemplate } from './importTemplates';
import { type FileProblem, importErrorText } from './importMessages';
import { prepareUpload } from './importFile';
import {
  ColumnsSection,
  ProgressSection,
  ResultSection,
  RowErrorsSection,
} from './BulkImportSections';

export interface BulkImportDrawerProps {
  template: ImportTemplate;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ACCEPTED_FILES =
  '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function Dropzone({
  file,
  onPick,
}: Readonly<{ file: File | null; onPick: (file: File | null) => void }>): React.ReactElement {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onPick(dropped);
  };

  return (
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
        className={`flex w-full flex-col items-center gap-2 rounded border-2 border-dashed p-8 text-center outline-none
          focus-visible:shadow-[0_0_0_3px_var(--ohs-sys-color-focus-ring)]
          ${dragging ? 'border-primary bg-primary-container' : 'border-outline hover:border-text-muted'}`}
      >
        <IconUpload size={32} className="text-text-muted" />
        <span className={`text-sm ${file ? 'font-medium text-primary' : 'text-text'}`}>
          {file ? file.name : t('bulkImportDropzone')}
        </span>
        <span className="text-xs text-text-muted">{t('bulkImportDropzoneHint')}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILES}
        aria-label={t('bulkImportUploadFile')}
        tabIndex={-1}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </>
  );
}

function Notice({
  tone,
  message,
}: Readonly<{ tone: 'error' | 'warning'; message: string }>): React.ReactElement {
  return (
    <div
      className={`flex items-start gap-2 rounded border border-border-tertiary bg-surface-variant p-3 text-sm
        ${tone === 'error' ? 'text-error' : 'text-text'}`}
    >
      <IconErrorFill size={18} className={`shrink-0 ${tone === 'warning' ? 'text-warning' : ''}`} />
      <span>{message}</span>
    </div>
  );
}

export function BulkImportDrawer({
  template,
  open,
  onClose,
  onComplete,
}: Readonly<BulkImportDrawerProps>): React.ReactElement {
  const { t } = useTranslation();
  const { phase, progress, result, failure, start, reset } = useBulkImport(template);
  const audit = useImportAudit(template);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<FileProblem | null>(null);
  const [preparing, setPreparing] = useState(false);
  const formId = `${template.id}-import-form`;
  const importing = preparing || phase === 'uploading';
  const error = importErrorText(problem, failure, file?.name ?? '', t);
  const title = t(template.titleKey);
  const interruptedErrors: readonly RowError[] =
    failure?.kind === 'interrupted' ? failure.rowErrors : [];

  const close = () => {
    if (importing) return;
    reset();
    setFile(null);
    setProblem(null);
    onClose();
  };

  const pick = (next: File | null) => {
    setFile(next);
    setProblem(null);
  };

  const run = async (picked: File) => {
    reset();
    setProblem(null);
    setPreparing(true);
    const prepared = await prepareUpload(picked, template);
    setPreparing(false);
    if (!prepared.ok) {
      setProblem(prepared.problem);
      return;
    }
    const outcome = await start(prepared.file);
    if (!outcome || !importWroteRows(outcome)) return;
    onComplete();
    await audit(picked.name, outcome);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) void run(file);
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{title}</h2>
      </div>
      <IconButton label={t('close')} onClick={close} disabled={importing}>
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
        <Button
          variant="outlined"
          type="button"
          onClick={close}
          disabled={importing}
          style={{ flex: 1 }}
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          form={formId}
          loading={importing}
          disabled={!file || importing}
          style={{ flex: 1 }}
        >
          {t('bulkImportStart')}
        </Button>
      </div>
    );

  return (
    <Drawer open={open} onClose={close} title={title} header={header} footer={footer}>
      <form id={formId} onSubmit={onSubmit} className="ohs-detail-body">
        {phase === 'idle' || phase === 'error' ? (
          <>
            {template.warningKey ? (
              <Notice tone="warning" message={t(template.warningKey)} />
            ) : null}
            <Section icon={IconUpload} title={t('bulkImportUploadFile')}>
              <Stack gap={4}>
                <Dropzone file={file} onPick={pick} />
                {error ? <Notice tone="error" message={error} /> : null}
              </Stack>
            </Section>
            {interruptedErrors.length > 0 ? (
              <RowErrorsSection rowErrors={interruptedErrors} />
            ) : null}
            <ColumnsSection template={template} />
          </>
        ) : null}

        {importing ? (
          <ProgressSection processed={progress.processed} total={progress.total} />
        ) : null}

        {phase === 'success' && result ? (
          <>
            <ResultSection result={result} titleKey={template.titleKey} />
            {result.rowErrors.length > 0 ? (
              <RowErrorsSection rowErrors={result.rowErrors} stoppedAtRow={result.stoppedAtRow} />
            ) : null}
          </>
        ) : null}
      </form>
    </Drawer>
  );
}
