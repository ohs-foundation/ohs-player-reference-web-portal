import { act, renderHook } from '@testing-library/react';
import { FhirError } from 'ohs-player-web-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCustomPostStream = vi.fn();
const mockErrorFromResponse = vi.fn();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useFhirClient: () => ({
      customPostStream: mockCustomPostStream,
      errorFromResponse: mockErrorFromResponse,
    }),
  };
});

const { useBulkImport } = await import('./useBulkImport');

const encoder = new TextEncoder();

function sseResponse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const frame = (payload: object): string => `data: ${JSON.stringify(payload)}\n\n`;
const csv = new File(['name\nKenya\n'], 'orgs.csv', { type: 'text/csv' });
const organizations = { alias: 'organizationsBulkImport', completion: 'done' } as const;
const users = { alias: 'usersBulkImport', completion: 'close' } as const;

describe('useBulkImport', () => {
  beforeEach(() => {
    mockCustomPostStream.mockReset();
    mockErrorFromResponse.mockReset();
  });

  it('posts the file as the multipart part named file to the given alias', async () => {
    mockCustomPostStream.mockResolvedValue(
      sseResponse([frame({ done: true, processed: 1, failed: 0, total: 1 })]),
    );
    const { result } = renderHook(() => useBulkImport(organizations));

    await act(() => result.current.start(csv));

    const [alias, body] = mockCustomPostStream.mock.calls[0] as [string, FormData];
    expect(alias).toBe('organizationsBulkImport');
    expect(body.get('file')).toBeInstanceOf(File);
    expect(result.current.phase).toBe('success');
    expect(result.current.result).toMatchObject({
      processed: 1,
      failed: 0,
      total: 1,
      outcome: 'completed',
    });
  });

  it('collects organisation row errors and finishes with the done counts', async () => {
    mockCustomPostStream.mockResolvedValue(
      sseResponse([
        frame({ processed: 1, total: 3 }),
        frame({ error: 'Parent organization not found: 9', row: 2 }),
        frame({ error: 'name is required', row: 3 }),
        frame({ done: true, processed: 1, failed: 2, total: 3 }),
      ]),
    );
    const { result } = renderHook(() => useBulkImport(organizations));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.start(csv);
    });

    expect(outcome).toMatchObject({ ok: true });
    expect(result.current.result).toEqual({
      processed: 1,
      failed: 2,
      total: 3,
      outcome: 'continued',
      rowErrors: [
        { row: 2, message: 'Parent organization not found: 9' },
        { row: 3, message: 'name is required' },
      ],
    });
  });

  it('completes a users import that closes without a done frame', async () => {
    mockCustomPostStream.mockResolvedValue(
      sseResponse([frame({ processed: 1, total: 2 }), frame({ processed: 2, total: 2 })]),
    );
    const { result } = renderHook(() => useBulkImport(users));

    await act(() => result.current.start(csv));

    expect(result.current.phase).toBe('success');
    expect(result.current.result).toMatchObject({
      processed: 2,
      failed: 0,
      total: 2,
      outcome: 'completed',
    });
  });

  it('reports a users import stopped by its first error row', async () => {
    mockCustomPostStream.mockResolvedValue(
      sseResponse([
        frame({ processed: 1, total: 5 }),
        frame({ processed: 2, total: 5 }),
        frame({ error: 'Group not found: nurses', row: 3 }),
      ]),
    );
    const { result } = renderHook(() => useBulkImport(users));

    await act(() => result.current.start(csv));

    expect(result.current.result).toMatchObject({
      processed: 2,
      failed: 1,
      total: 5,
      outcome: 'stopped',
      stoppedAtRow: 3,
    });
  });

  it('surfaces the gateway error text of a response that is not ok', async () => {
    const res = new Response(
      JSON.stringify({ error: 'Insufficient permissions. Required: bulk-import.manage' }),
      { status: 403 },
    );
    mockCustomPostStream.mockResolvedValue(res);
    mockErrorFromResponse.mockResolvedValue(
      new FhirError('Insufficient permissions. Required: bulk-import.manage', 403, { error: 'x' }),
    );
    const { result } = renderHook(() => useBulkImport(organizations));

    await act(() => result.current.start(csv));

    expect(mockErrorFromResponse).toHaveBeenCalledWith(res);
    expect(result.current.phase).toBe('error');
    expect(result.current.failure).toEqual({
      kind: 'request',
      error: new FhirError('Insufficient permissions. Required: bulk-import.manage', 403, {
        error: 'x',
      }),
    });
  });

  it('reports a stream that closes with no frames as empty', async () => {
    mockCustomPostStream.mockResolvedValue(sseResponse([]));
    const { result } = renderHook(() => useBulkImport(users));

    await act(() => result.current.start(csv));

    expect(result.current.failure).toEqual({ kind: 'empty' });
  });

  it('reports an organisations stream that closes without done as interrupted', async () => {
    mockCustomPostStream.mockResolvedValue(sseResponse([frame({ processed: 50, total: 120 })]));
    const { result } = renderHook(() => useBulkImport(organizations));

    await act(() => result.current.start(csv));

    expect(result.current.failure).toEqual({ kind: 'interrupted', processed: 50, rowErrors: [] });
    expect(result.current.progress).toEqual({ processed: 50, total: 120 });
  });

  it('cancels the stream and drops the result when unmounted mid import', async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        c.enqueue(encoder.encode(frame({ processed: 1, total: 9 })));
      },
      cancel,
    });
    mockCustomPostStream.mockResolvedValue(new Response(body, { status: 200 }));
    const { result, unmount } = renderHook(() => useBulkImport(organizations));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.start(csv);
    });
    await vi.waitFor(() => expect(controller).toBeDefined());
    await act(async () => {
      await Promise.resolve();
    });
    unmount();

    await expect(pending).resolves.toBeNull();
    expect(cancel).toHaveBeenCalled();
  });
});
