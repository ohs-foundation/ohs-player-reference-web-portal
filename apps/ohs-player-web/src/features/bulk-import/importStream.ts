export type ImportFrame =
  | { kind: 'progress'; processed: number; total: number }
  | { kind: 'error'; message: string; row: number }
  | { kind: 'done'; processed: number; failed: number; total: number };

export type ImportCompletion = 'done' | 'close';

export interface RowError {
  row: number;
  message: string;
}

export interface ImportResult {
  processed: number;
  failed: number;
  total: number | null;
  rowErrors: RowError[];
  outcome: 'completed' | 'stopped' | 'continued';
  stoppedAtRow?: number;
}

export type ImportFailure =
  | { kind: 'request'; message: string }
  | { kind: 'empty' }
  | { kind: 'interrupted'; processed: number; rowErrors: RowError[] };

export type ImportOutcome =
  | { ok: true; result: ImportResult }
  | { ok: false; failure: ImportFailure };

const FRAME_SEPARATOR = '\n\n';
const DATA_PREFIX = 'data:';
const FIRST_PRINTABLE_CODE = 0x20;

function blankControlCharacters(text: string): string {
  return Array.from(text, (ch) => (ch.charCodeAt(0) < FIRST_PRINTABLE_CODE ? ' ' : ch)).join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function frameFromJson(value: unknown): ImportFrame | null {
  if (!isRecord(value)) return null;
  const { processed, failed, total, error, row, done } = value;
  if (done === true && isCount(processed) && isCount(failed) && isCount(total)) {
    return { kind: 'done', processed, failed, total };
  }
  if (typeof error === 'string' && isCount(row)) return { kind: 'error', message: error, row };
  if (isCount(processed) && isCount(total)) return { kind: 'progress', processed, total };
  return null;
}

export function parseFrameLine(line: string): ImportFrame | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(DATA_PREFIX)) return null;
  const json = blankControlCharacters(trimmed.slice(DATA_PREFIX.length)).trim();
  if (!json) return null;
  try {
    return frameFromJson(JSON.parse(json));
  } catch {
    return null;
  }
}

function framesFromBlock(block: string): ImportFrame[] {
  return block
    .split('\n')
    .map(parseFrameLine)
    .filter((frame): frame is ImportFrame => frame !== null);
}

export async function readFrames(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onFrame: (frame: ImportFrame) => void,
): Promise<ImportFrame[]> {
  const decoder = new TextDecoder();
  const frames: ImportFrame[] = [];
  const take = (block: string): void => {
    for (const frame of framesFromBlock(block)) {
      frames.push(frame);
      onFrame(frame);
    }
  };
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf(FRAME_SEPARATOR);
    while (separator !== -1) {
      take(buffer.slice(0, separator));
      buffer = buffer.slice(separator + FRAME_SEPARATOR.length);
      separator = buffer.indexOf(FRAME_SEPARATOR);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) take(buffer);
  return frames;
}

function lastProgress(
  frames: readonly ImportFrame[],
): { processed: number; total: number } | undefined {
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    const frame = frames[i];
    if (frame.kind === 'progress') return frame;
  }
  return undefined;
}

export function outcomeFromFrames(
  frames: readonly ImportFrame[],
  completion: ImportCompletion,
): ImportOutcome {
  if (frames.length === 0) return { ok: false, failure: { kind: 'empty' } };
  const rowErrors = frames.flatMap((frame) =>
    frame.kind === 'error' ? [{ row: frame.row, message: frame.message }] : [],
  );
  const done = frames.find((frame) => frame.kind === 'done');
  if (done) {
    const { processed, failed, total } = done;
    const outcome = failed > 0 ? 'continued' : 'completed';
    return { ok: true, result: { processed, failed, total, rowErrors, outcome } };
  }
  const progress = lastProgress(frames);
  const processed = progress?.processed ?? 0;
  if (completion === 'done') {
    return { ok: false, failure: { kind: 'interrupted', processed, rowErrors } };
  }
  const stop = rowErrors[0];
  return {
    ok: true,
    result: {
      processed,
      failed: rowErrors.length,
      total: progress?.total ?? null,
      rowErrors,
      outcome: stop ? 'stopped' : 'completed',
      ...(stop ? { stoppedAtRow: stop.row } : {}),
    },
  };
}

export function importWroteRows(outcome: ImportOutcome): boolean {
  return outcome.ok || (outcome.failure.kind === 'interrupted' && outcome.failure.processed > 0);
}
