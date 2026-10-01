import {
  IconCheckCircleFill,
  IconDownload,
  IconErrorFill,
  IconFileList,
  IconUpload,
  Button,
  LinearProgress,
  Stack,
} from 'ohs-player-web-shell';
import { useTranslation } from 'ohs-player-web-core';
import { Section } from '../users/userFormControls';
import { type ImportResult, type RowError } from './importStream';
import { downloadImportTemplate, type ImportTemplate } from './importTemplates';

const VISIBLE_ROW_ERRORS = 10;

export function ColumnsSection({
  template,
}: Readonly<{ template: ImportTemplate }>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Section icon={IconFileList} title={t('bulkImportExpectedColumns')}>
      <Stack gap={4}>
        <div className="flex flex-wrap gap-2">
          {template.columns.map((c) => (
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
        <p className="m-0 text-xs text-text-muted">{t('bulkImportTemplateHint')}</p>
        <div>
          <Button
            variant="outlined"
            type="button"
            iconLeft={<IconDownload size={18} />}
            onClick={() => downloadImportTemplate(template)}
          >
            {t('bulkImportDownloadTemplate')}
          </Button>
        </div>
      </Stack>
    </Section>
  );
}

export function ProgressSection({
  processed,
  total,
}: Readonly<{ processed: number; total: number }>): React.ReactElement {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const text = t('bulkImportProgress', { processed, total, pct });
  return (
    <Section icon={IconUpload} title={t('bulkImportUploadFile')}>
      <Stack gap={3}>
        <LinearProgress
          indeterminate={total === 0}
          value={processed}
          max={total || 100}
          label={text}
        />
        <output className="text-sm text-text-muted">{text}</output>
      </Stack>
    </Section>
  );
}

function resultHeadingKey(result: ImportResult): string {
  if (result.outcome === 'stopped') return 'bulkImportStoppedTitle';
  return result.failed > 0 ? 'bulkImportPartial' : 'bulkImportComplete';
}

function CountRow({
  label,
  value,
  alert = false,
}: Readonly<{ label: string; value: number | string; alert?: boolean }>): React.ReactElement {
  return (
    <div className="flex justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`m-0 ${alert ? 'text-error' : 'text-text'}`}>{value}</dd>
    </div>
  );
}

export function ResultSection({
  result,
  titleKey,
}: Readonly<{ result: ImportResult; titleKey: string }>): React.ReactElement {
  const { t } = useTranslation();
  const clean = result.failed === 0;
  return (
    <Section icon={IconUpload} title={t(titleKey)}>
      <Stack gap={4}>
        <output className="flex items-center gap-2 text-text">
          {clean ? (
            <IconCheckCircleFill size={22} className="text-positive" />
          ) : (
            <IconErrorFill size={22} className="text-warning" />
          )}
          <span className="text-base font-semibold">{t(resultHeadingKey(result))}</span>
        </output>
        <dl className="m-0 flex flex-col gap-1 text-sm">
          <CountRow label={t('bulkImportTotal')} value={result.total ?? '—'} />
          <CountRow label={t('bulkImportProcessed')} value={result.processed} />
          <CountRow label={t('bulkImportFailed')} value={result.failed} alert={!clean} />
        </dl>
        {clean ? null : (
          <p className="m-0 rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-text-muted">
            {t('bulkImportFailedNotice', { failed: result.failed })}
          </p>
        )}
      </Stack>
    </Section>
  );
}

function errorSummaryKey(stoppedAtRow: number | undefined): string {
  return stoppedAtRow === undefined ? 'bulkImportContinued' : 'bulkImportStopped';
}

export function RowErrorsSection({
  rowErrors,
  stoppedAtRow,
}: Readonly<{ rowErrors: readonly RowError[]; stoppedAtRow?: number }>): React.ReactElement {
  const { t } = useTranslation();
  const visible = rowErrors.slice(0, VISIBLE_ROW_ERRORS);
  const hidden = rowErrors.length - visible.length;
  return (
    <Section icon={IconErrorFill} title={t('bulkImportRowErrors')}>
      <Stack gap={3}>
        <p className="m-0 rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-text">
          {t(errorSummaryKey(stoppedAtRow), { row: stoppedAtRow ?? 0 })}
        </p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-text">
          {visible.map((e) => (
            <li key={`${e.row}-${e.message}`}>
              {t('bulkImportRowError', { row: e.row, message: e.message })}
            </li>
          ))}
        </ul>
        {hidden > 0 ? (
          <p className="m-0 text-sm text-text-muted">
            {t('bulkImportMoreErrors', { count: hidden })}
          </p>
        ) : null}
        <p className="m-0 text-xs text-text-muted">{t('bulkImportRowNumberHint')}</p>
      </Stack>
    </Section>
  );
}
