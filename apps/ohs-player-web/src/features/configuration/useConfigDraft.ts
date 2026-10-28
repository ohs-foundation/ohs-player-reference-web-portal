import { useCallback, useMemo, useState } from 'react';
import { draftObject, draftText, type ParsedDraft } from './configDraft';
import { checkDraft } from './draftChecks';
import { diffDocuments, type DocumentChange } from './documentDiff';

interface DraftSnapshot {
  text: string;
  assisted: boolean;
}

export interface ConfigDraft {
  text: string;
  parsed: ParsedDraft;
  changes: DocumentChange[];
  assisted: boolean;
  canRestore: boolean;
  setText: (text: string) => void;
  reset: () => void;
  replaceWith: (document: Record<string, unknown>) => void;
  restore: () => void;
}

export function useConfigDraft(running: Record<string, unknown>): ConfigDraft {
  const initial = useMemo(() => draftText(running), [running]);
  const [text, setTextState] = useState(initial);
  const [assisted, setAssisted] = useState(false);
  const [previous, setPrevious] = useState<DraftSnapshot>();

  const parsed = useMemo(() => checkDraft(text), [text]);
  const changes = useMemo(() => {
    const value = draftObject(parsed);
    return value ? diffDocuments(running, value) : [];
  }, [parsed, running]);

  const setText = useCallback((next: string) => {
    setTextState(next);
    setPrevious(undefined);
  }, []);

  const reset = useCallback(() => {
    setTextState(initial);
    setAssisted(false);
    setPrevious(undefined);
  }, [initial]);

  const replaceWith = useCallback(
    (document: Record<string, unknown>) => {
      setPrevious({ text, assisted });
      setTextState(draftText(document));
      setAssisted(true);
    },
    [text, assisted],
  );

  const restore = useCallback(() => {
    if (!previous) return;
    setTextState(previous.text);
    setAssisted(previous.assisted);
    setPrevious(undefined);
  }, [previous]);

  return {
    text,
    parsed,
    changes,
    assisted,
    canRestore: previous !== undefined,
    setText,
    reset,
    replaceWith,
    restore,
  };
}
