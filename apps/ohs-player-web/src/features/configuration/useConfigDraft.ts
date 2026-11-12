import { useCallback, useMemo, useState } from 'react';
import { draftObject, draftText, type ParsedDraft } from './configDraft';
import { checkDraft } from './draftChecks';
import { diffDocuments, type DocumentChange } from './documentDiff';

export interface ConfigDraft {
  text: string;
  parsed: ParsedDraft;
  changes: DocumentChange[];
  setText: (text: string) => void;
  reset: () => void;
}

export function useConfigDraft(running: Record<string, unknown>): ConfigDraft {
  const initial = useMemo(() => draftText(running), [running]);
  const [text, setText] = useState(initial);

  const parsed = useMemo(() => checkDraft(text), [text]);
  const changes = useMemo(() => {
    const value = draftObject(parsed);
    return value ? diffDocuments(running, value) : [];
  }, [parsed, running]);

  const reset = useCallback(() => setText(initial), [initial]);

  return { text, parsed, changes, setText, reset };
}
