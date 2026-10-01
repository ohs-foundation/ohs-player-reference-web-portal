import { type FileProblem } from './importMessages';

export type CsvText = { ok: true; text: string } | { ok: false; problem: FileProblem };

const UNSENDABLE = /[,\n\r]/;
const XLS_ERROR_CODE = 'XLS_FILE_NOT_SUPPORTED';
const COLUMN_LETTERS = 26;
const LETTER_A = 65;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function cellText(cell: unknown): string {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  if (typeof cell === 'number') {
    return cell.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 15 });
  }
  if (cell instanceof Date) {
    return `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}-${pad(cell.getUTCDate())}`;
  }
  return '';
}

function columnLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % COLUMN_LETTERS;
    letters = String.fromCharCode(LETTER_A + rem) + letters;
    n = Math.floor((n - 1) / COLUMN_LETTERS);
  }
  return letters;
}

function lastFilledRow(rows: readonly string[][]): number {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].some((cell) => cell !== '')) return i;
  }
  return -1;
}

export function rowsToCsv(rows: readonly (readonly unknown[])[]): CsvText {
  const texts = rows.map((row) => row.map(cellText));
  const kept = texts.slice(0, lastFilledRow(texts) + 1);
  if (kept.length === 0) return { ok: false, problem: { kind: 'noRows' } };
  const header = kept[0];
  for (let r = 0; r < kept.length; r += 1) {
    const c = kept[r].findIndex((cell) => UNSENDABLE.test(cell));
    if (c !== -1) {
      const column = header[c] && !UNSENDABLE.test(header[c]) ? header[c] : columnLetter(c);
      return { ok: false, problem: { kind: 'unsupportedCell', row: r + 1, column } };
    }
  }
  const lines = kept.map((row) => (row.every((cell) => cell === '') ? '' : row.join(',')));
  return { ok: true, text: lines.join('\n') + '\n' };
}

function isXlsError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === XLS_ERROR_CODE;
}

export async function workbookToCsv(bytes: ArrayBuffer): Promise<CsvText> {
  let rows: unknown[][];
  try {
    const { readSheet } = await import('read-excel-file/browser');
    rows = await readSheet(bytes);
  } catch (err) {
    return { ok: false, problem: { kind: isXlsError(err) ? 'fileType' : 'unreadable' } };
  }
  return rowsToCsv(rows);
}
