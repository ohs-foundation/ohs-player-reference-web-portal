import { describeError, errorDetail } from 'ohs-player-web-shell';
import { type ImportFailure } from './importStream';

export type FileProblem =
  | { kind: 'fileType' }
  | { kind: 'tooLarge'; maxMegabytes: number }
  | { kind: 'workbookAsCsv' }
  | { kind: 'notUtf8' }
  | { kind: 'quotedCsv'; line: number }
  | { kind: 'missingColumns'; columns: string[] }
  | { kind: 'noRows' }
  | { kind: 'unsupportedCell'; row: number; column: string }
  | { kind: 'unreadable' };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function fileProblemMessage(problem: FileProblem, fileName: string, t: Translate): string {
  switch (problem.kind) {
    case 'fileType':
      return t('bulkImportFileType');
    case 'tooLarge':
      return t('bulkImportFileTooLarge', { max: problem.maxMegabytes });
    case 'workbookAsCsv':
      return t('bulkImportWorkbookAsCsv');
    case 'notUtf8':
      return t('bulkImportNotUtf8');
    case 'quotedCsv':
      return t('bulkImportQuotedCsv', { line: problem.line });
    case 'missingColumns':
      return t('bulkImportMissingColumns', { columns: problem.columns.join(', ') });
    case 'noRows':
      return t('bulkImportNoRows');
    case 'unsupportedCell':
      return t('bulkImportUnsupportedCell', { row: problem.row, column: problem.column });
    case 'unreadable':
      return t('bulkImportUnreadable', { file: fileName });
  }
}

export function failureMessage(failure: ImportFailure, t: Translate): string {
  switch (failure.kind) {
    case 'request':
      return describeError(failure.error, t, {
        action: 'save',
        nothingSavedKey: 'bulkImportNothingImported',
      }).description;
    case 'empty':
      return t('bulkImportStreamEmpty');
    case 'interrupted':
      return t('bulkImportStreamInterrupted', { processed: failure.processed });
  }
}

export function importErrorDetail(failure: ImportFailure | null): string {
  return failure?.kind === 'request' ? errorDetail(failure.error) : '';
}

export function importErrorText(
  problem: FileProblem | null,
  failure: ImportFailure | null,
  fileName: string,
  t: Translate,
): string | null {
  if (problem) return fileProblemMessage(problem, fileName, t);
  return failure ? failureMessage(failure, t) : null;
}
