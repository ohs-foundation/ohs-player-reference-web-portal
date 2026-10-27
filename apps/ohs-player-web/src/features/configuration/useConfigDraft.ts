import { useCallback, useMemo, useState } from 'react';
import { draftObject, draftText, parseDraft, type ParsedDraft } from './configDraft';
import { diffDocuments, type DocumentChange } from './documentDiff';

export type DraftOrigin = 'edit' | 'proposal';

export interface ConfigDraft {
  text: string;
  parsed: ParsedDraft;
  changes: DocumentChange[];
  origin: DraftOrigin;
  canRestore: boolean;
  setText: (text: string) => void;
  reset: () => void;
  replaceWith: (document: Record<string, unknown>) => void;
  restore: () => void;
}

export function useConfigDraft(running: Record<string, unknown>): ConfigDraft {
  const initial = useMemo(() => draftText(running), [running]);
  const [text, setTextState] = useState(initial);
  const [previous, setPrevious] = useState<string>();
  const [origin, setOrigin] = useState<DraftOrigin>('edit');

  const parsed = useMemo(() => parseDraft(text), [text]);
  const changes = useMemo(() => {
    const value = draftObject(parsed);
    return value ? diffDocuments(running, value) : [];
  }, [parsed, running]);

  const setText = useCallback((next: string) => {
    setTextState(next);
    setPrevious(undefined);
    setOrigin('edit');
  }, []);

  const reset = useCallback(() => setText(initial), [initial, setText]);

  const replaceWith = useCallback(
    (document: Record<string, unknown>) => {
      setPrevious(text);
      setTextState(draftText(document));
      setOrigin('proposal');
    },
    [text],
  );

  const restore = useCallback(() => {
    if (previous === undefined) return;
    setText(previous);
  }, [previous, setText]);

  return {
    text,
    parsed,
    changes,
    origin,
    canRestore: previous !== undefined,
    setText,
    reset,
    replaceWith,
    restore,
  };
}
