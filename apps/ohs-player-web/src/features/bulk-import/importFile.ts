import { type FileProblem } from './importMessages';
import { requiredColumns, type ImportTemplate } from './importTemplates';
import { type CsvText, workbookToCsv } from './workbookToCsv';

export type PreparedUpload = { ok: true; file: File } | { ok: false; problem: FileProblem };

export type FileKind = 'csv' | 'xlsx';

const MEGABYTE = 1024 * 1024;
export const MAX_CSV_MEGABYTES = 50;
export const MAX_WORKBOOK_MEGABYTES = 10;
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const BYTE_ORDER_MARK = '\uFEFF';
const QUOTE = '"';

function fileKind(name: string): FileKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  return null;
}

export function readBytes(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('File could not be read'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File could not be read'));
    reader.readAsArrayBuffer(file);
  });
}

function isZip(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, ZIP_SIGNATURE.length));
  return ZIP_SIGNATURE.every((byte, i) => head[i] === byte);
}

export function csvTextFromBytes(bytes: ArrayBuffer): CsvText {
  if (isZip(bytes)) return { ok: false, problem: { kind: 'workbookAsCsv' } };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, problem: { kind: 'notUtf8' } };
  }
  const withoutBom = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
  return { ok: true, text: withoutBom.replace(/\r\n?/g, '\n') };
}

function trimTrailingBlankLines(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') end -= 1;
  return lines.slice(0, end);
}

function quotedLine(lines: readonly string[]): number {
  const index = lines.findIndex((line) =>
    line.split(',').some((cell) => cell.trim().startsWith(QUOTE)),
  );
  return index === -1 ? 0 : index + 1;
}

export function checkCsv(text: string, template: ImportTemplate, kind: FileKind): CsvText {
  const lines = trimTrailingBlankLines(text.split('\n'));
  if (lines.length === 0) return { ok: false, problem: { kind: 'noRows' } };
  const quoted = kind === 'csv' ? quotedLine(lines) : 0;
  if (quoted > 0) return { ok: false, problem: { kind: 'quotedCsv', line: quoted } };
  const header = lines[0].split(',').map((cell) => cell.trim());
  const missing = requiredColumns(template).filter((column) => !header.includes(column));
  if (missing.length > 0)
    return { ok: false, problem: { kind: 'missingColumns', columns: missing } };
  if (!lines.slice(1).some((line) => line.trim() !== '')) {
    return { ok: false, problem: { kind: 'noRows' } };
  }
  return { ok: true, text: lines.join('\n') + '\n' };
}

function csvFileName(name: string, kind: FileKind): string {
  return kind === 'csv' ? name : name.replace(/\.xlsx$/i, '.csv');
}

export async function prepareUpload(file: File, template: ImportTemplate): Promise<PreparedUpload> {
  const kind = fileKind(file.name);
  if (!kind) return { ok: false, problem: { kind: 'fileType' } };
  const maxMegabytes = kind === 'csv' ? MAX_CSV_MEGABYTES : MAX_WORKBOOK_MEGABYTES;
  if (file.size > maxMegabytes * MEGABYTE) {
    return { ok: false, problem: { kind: 'tooLarge', maxMegabytes } };
  }
  let bytes: ArrayBuffer;
  try {
    bytes = await readBytes(file);
  } catch {
    return { ok: false, problem: { kind: 'unreadable' } };
  }
  const csv = kind === 'csv' ? csvTextFromBytes(bytes) : await workbookToCsv(bytes);
  if (!csv.ok) return csv;
  const checked = checkCsv(csv.text, template, kind);
  if (!checked.ok) return checked;
  return {
    ok: true,
    file: new File([checked.text], csvFileName(file.name, kind), { type: 'text/csv' }),
  };
}
