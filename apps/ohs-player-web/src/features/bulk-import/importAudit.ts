import { type ImportOutcome } from './importStream';

function counts(processed: number, failed: number, total: number | null): string {
  return `${processed} imported, ${failed} failed, ${total ?? 'unknown'} rows`;
}

export function importAuditDescription(fileName: string, outcome: ImportOutcome): string {
  if (!outcome.ok) {
    const processed = outcome.failure.kind === 'interrupted' ? outcome.failure.processed : 0;
    return `Bulk import of ${fileName} ended before completion: ${processed} imported`;
  }
  const { processed, failed, total, stoppedAtRow } = outcome.result;
  const summary = `Bulk import of ${fileName}: ${counts(processed, failed, total)}`;
  return stoppedAtRow === undefined ? summary : `${summary}, stopped at row ${stoppedAtRow}`;
}
