import { useCallback, useEffect, useRef, useState } from 'react';
import { type FhirClient, useFhirClient } from 'ohs-player-web-core';
import { toErrorMessage } from '../sdc/toErrorMessage';
import {
  type ImportCompletion,
  type ImportFailure,
  type ImportOutcome,
  type ImportResult,
  outcomeFromFrames,
  readFrames,
} from './importStream';

export interface ImportProgress {
  processed: number;
  total: number;
}

export type ImportPhase = 'idle' | 'uploading' | 'success' | 'error';

export interface ImportStreamOptions {
  alias: string;
  completion: ImportCompletion;
}

export interface BulkImportState {
  phase: ImportPhase;
  progress: ImportProgress;
  result: ImportResult | null;
  failure: ImportFailure | null;
  start: (file: File) => Promise<ImportOutcome | null>;
  reset: () => void;
}

const NO_PROGRESS: ImportProgress = { processed: 0, total: 0 };

function uploadForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

interface StreamHooks {
  onReader: (reader: ReadableStreamDefaultReader<Uint8Array>) => void;
  onProgress: (progress: ImportProgress) => void;
}

async function streamImport(
  client: FhirClient,
  { alias, completion }: ImportStreamOptions,
  file: File,
  { onReader, onProgress }: StreamHooks,
): Promise<ImportOutcome> {
  try {
    const res = await client.customPostStream(alias, uploadForm(file));
    if (!res.ok) throw await client.errorFromResponse(res);
    if (!res.body) return { ok: false, failure: { kind: 'empty' } };
    const reader = res.body.getReader();
    onReader(reader);
    const frames = await readFrames(reader, (frame) => {
      if (frame.kind === 'progress') onProgress({ processed: frame.processed, total: frame.total });
    });
    return outcomeFromFrames(frames, completion);
  } catch (err) {
    return { ok: false, failure: { kind: 'request', message: toErrorMessage(err) } };
  }
}

export function useBulkImport({ alias, completion }: ImportStreamOptions): BulkImportState {
  const client = useFhirClient();
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [progress, setProgress] = useState<ImportProgress>(NO_PROGRESS);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const runRef = useRef(0);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const abandonRun = useCallback(() => {
    runRef.current += 1;
    readerRef.current?.cancel().catch(() => undefined);
    readerRef.current = null;
  }, []);

  useEffect(() => abandonRun, [abandonRun]);

  const reset = useCallback(() => {
    abandonRun();
    setPhase('idle');
    setProgress(NO_PROGRESS);
    setResult(null);
    setFailure(null);
  }, [abandonRun]);

  const start = useCallback(
    async (file: File): Promise<ImportOutcome | null> => {
      runRef.current += 1;
      const run = runRef.current;
      const isLive = (): boolean => runRef.current === run;
      setPhase('uploading');
      setProgress(NO_PROGRESS);
      setResult(null);
      setFailure(null);

      const outcome = await streamImport(client, { alias, completion }, file, {
        onReader: (reader) => {
          if (isLive()) readerRef.current = reader;
          else reader.cancel().catch(() => undefined);
        },
        onProgress: (next) => {
          if (isLive()) setProgress(next);
        },
      });
      if (!isLive()) return null;
      readerRef.current = null;
      if (outcome.ok) {
        const { processed, total } = outcome.result;
        setResult(outcome.result);
        setProgress({ processed, total: total ?? processed });
        setPhase('success');
      } else {
        setFailure(outcome.failure);
        setPhase('error');
      }
      return outcome;
    },
    [client, alias, completion],
  );

  return { phase, progress, result, failure, start, reset };
}
