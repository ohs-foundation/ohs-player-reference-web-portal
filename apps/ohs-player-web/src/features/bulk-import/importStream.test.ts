import { describe, expect, it } from 'vitest';
import {
  type ImportFrame,
  importWroteRows,
  outcomeFromFrames,
  parseFrameLine,
  readFrames,
} from './importStream';

function readerOf(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }).getReader();
}

const progress = (processed: number, total: number): ImportFrame => ({
  kind: 'progress',
  processed,
  total,
});
const rowError = (row: number, message: string): ImportFrame => ({ kind: 'error', row, message });

describe('parseFrameLine', () => {
  it('reads the three backend frame shapes', () => {
    expect(parseFrameLine('data: {"processed":5,"total":100}')).toEqual(progress(5, 100));
    expect(parseFrameLine('data: {"error":"Group not found: nurses","row":6}')).toEqual(
      rowError(6, 'Group not found: nurses'),
    );
    expect(parseFrameLine('data: {"done":true,"processed":48,"failed":2,"total":50}')).toEqual({
      kind: 'done',
      processed: 48,
      failed: 2,
      total: 50,
    });
  });

  it('parses an error message carrying a raw carriage return or tab', () => {
    expect(parseFrameLine('data: {"error":"HAPI-0450:\rbad\tvalue","row":3}')).toEqual(
      rowError(3, 'HAPI-0450: bad value'),
    );
  });

  it('ignores non data lines, invalid JSON and unknown shapes', () => {
    expect(parseFrameLine(': keep-alive')).toBeNull();
    expect(parseFrameLine('data: {not json')).toBeNull();
    expect(parseFrameLine('data: {"hello":1}')).toBeNull();
    expect(parseFrameLine('data:')).toBeNull();
  });
});

describe('readFrames', () => {
  it('joins a frame split across two chunks', async () => {
    const seen: ImportFrame[] = [];
    const frames = await readFrames(
      readerOf(['data: {"processed":1,', '"total":2}\n\ndata: {"processed":2,"total":2}\n\n']),
      (frame) => seen.push(frame),
    );
    expect(frames).toEqual([progress(1, 2), progress(2, 2)]);
    expect(seen).toEqual(frames);
  });

  it('keeps a trailing frame without the blank line separator', async () => {
    expect(
      await readFrames(readerOf(['data: {"processed":1,"total":1}']), () => undefined),
    ).toEqual([progress(1, 1)]);
  });
});

describe('outcomeFromFrames', () => {
  it('reports no frames as an empty stream', () => {
    expect(outcomeFromFrames([], 'close')).toEqual({ ok: false, failure: { kind: 'empty' } });
    expect(outcomeFromFrames([], 'done')).toEqual({ ok: false, failure: { kind: 'empty' } });
  });

  it('takes the counts from done and marks row errors as continued', () => {
    const outcome = outcomeFromFrames(
      [
        progress(20, 50),
        rowError(21, 'name is required'),
        rowError(33, 'Parent organization not found: 9'),
        { kind: 'done', processed: 48, failed: 2, total: 50 },
      ],
      'done',
    );
    expect(outcome).toEqual({
      ok: true,
      result: {
        processed: 48,
        failed: 2,
        total: 50,
        outcome: 'continued',
        rowErrors: [
          { row: 21, message: 'name is required' },
          { row: 33, message: 'Parent organization not found: 9' },
        ],
      },
    });
  });

  it('treats a stream that needs done and closes without it as interrupted', () => {
    expect(outcomeFromFrames([progress(50, 200), rowError(51, 'boom')], 'done')).toEqual({
      ok: false,
      failure: { kind: 'interrupted', processed: 50, rowErrors: [{ row: 51, message: 'boom' }] },
    });
  });

  it('completes a users stream on a clean close', () => {
    expect(outcomeFromFrames([progress(1, 3), progress(2, 3), progress(3, 3)], 'close')).toEqual({
      ok: true,
      result: { processed: 3, failed: 0, total: 3, rowErrors: [], outcome: 'completed' },
    });
  });

  it('stops a users stream at its first error row', () => {
    const frames = [1, 2, 3, 4, 5].map((n) => progress(n, 10));
    expect(outcomeFromFrames([...frames, rowError(6, 'Group not found: x')], 'close')).toEqual({
      ok: true,
      result: {
        processed: 5,
        failed: 1,
        total: 10,
        rowErrors: [{ row: 6, message: 'Group not found: x' }],
        outcome: 'stopped',
        stoppedAtRow: 6,
      },
    });
  });

  it('leaves the total unknown when the first users row fails', () => {
    const outcome = outcomeFromFrames(
      [rowError(1, 'An unexpected error occurred processing this row')],
      'close',
    );
    expect(outcome.ok && outcome.result).toMatchObject({
      processed: 0,
      failed: 1,
      total: null,
      stoppedAtRow: 1,
    });
  });
});

describe('importWroteRows', () => {
  it('is true for a finished import and for one interrupted after writing rows', () => {
    expect(importWroteRows(outcomeFromFrames([progress(1, 1)], 'close'))).toBe(true);
    expect(importWroteRows(outcomeFromFrames([progress(50, 90)], 'done'))).toBe(true);
  });

  it('is false when nothing reached the server or nothing was written', () => {
    expect(
      importWroteRows({ ok: false, failure: { kind: 'request', error: new Error('HTTP 403') } }),
    ).toBe(false);
    expect(importWroteRows({ ok: false, failure: { kind: 'empty' } })).toBe(false);
    expect(importWroteRows(outcomeFromFrames([rowError(1, 'boom')], 'done'))).toBe(false);
  });
});
