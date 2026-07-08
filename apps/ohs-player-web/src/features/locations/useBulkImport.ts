import { useCallback, useRef, useState } from 'react';
import { FhirError, useFhirClient } from 'ohs-player-web-core';

export interface ImportProgress {
  processed: number;
  total: number;
}

export interface ImportResult {
  done: true;
  processed: number;
  failed: number;
  total: number;
}

export type ImportPhase = 'idle' | 'uploading' | 'success' | 'error';

interface ParsedEvent {
  processed?: number;
  total?: number;
  done?: boolean;
  failed?: number;
}

/**
 * POST a CSV to `POST /api/bulk-import/locations` (multipart, field `file`) and consume the Server-Sent
 * Events stream: per-row `data: {"processed":N,"total":M}` then a final `data: {"done":true,...}`. Role
 * required: `bulk-import.manage`.
 */
export function useBulkImport() {
  const client = useFhirClient();
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [progress, setProgress] = useState<ImportProgress>({ processed: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setProgress({ processed: 0, total: 0 });
    setResult(null);
    setError(null);
  }, []);

  const start = useCallback(
    async (file: File) => {
      setPhase('uploading');
      setProgress({ processed: 0, total: 0 });
      setResult(null);
      setError(null);

      const form = new FormData();
      form.append('file', file);

      try {
        const res = await client.customPostStream('locationsBulkImport', form);
        if (!res.ok) {
          const err = await client.errorFromResponse(res);
          throw err;
        }
        if (!res.body) throw new Error('No response stream');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // Holder object (not a bare `let`) so TS doesn't narrow the closure-mutated value away.
        const state: { final: ImportResult | null } = { final: null };

        // SSE frames are separated by a blank line; each `data:` line carries one JSON payload.
        const handleFrame = (frame: string) => {
          for (const line of frame.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const json = trimmed.slice(5).trim();
            if (!json) continue;
            let evt: ParsedEvent;
            try {
              evt = JSON.parse(json) as ParsedEvent;
            } catch {
              continue;
            }
            if (evt.done) {
              state.final = {
                done: true,
                processed: evt.processed ?? 0,
                failed: evt.failed ?? 0,
                total: evt.total ?? 0,
              };
            } else if (typeof evt.processed === 'number') {
              setProgress({ processed: evt.processed, total: evt.total ?? 0 });
            }
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep = buffer.indexOf('\n\n');
          while (sep !== -1) {
            handleFrame(buffer.slice(0, sep));
            buffer = buffer.slice(sep + 2);
            sep = buffer.indexOf('\n\n');
          }
        }
        if (buffer.trim()) handleFrame(buffer);

        if (state.final) {
          setResult(state.final);
          setProgress({ processed: state.final.processed, total: state.final.total });
          setPhase('success');
        } else {
          throw new Error('Import stream ended without a completion event');
        }
      } catch (err) {
        setError(err instanceof FhirError ? err.message : err instanceof Error ? err.message : String(err));
        setPhase('error');
      }
    },
    [client],
  );

  return { phase, progress, result, error, start, reset };
}
