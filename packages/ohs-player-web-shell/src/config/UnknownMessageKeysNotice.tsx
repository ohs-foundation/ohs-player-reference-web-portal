import { useStatusBar, useTranslation } from 'ohs-player-web-core';
import { useEffect, useRef } from 'react';
import type { UnknownMessageKey } from './unknownMessageKeys';

/** Shows one warning toast naming the document's message keys that no catalogue declares. */
export function UnknownMessageKeysNotice({
  keys,
}: Readonly<{ keys?: readonly UnknownMessageKey[] }>): null {
  const { notify } = useStatusBar();
  const { t } = useTranslation();
  const shown = useRef(false);

  useEffect(() => {
    if (!keys?.length || shown.current) return;
    shown.current = true;
    notify({
      tone: 'warning',
      title: t('configUnknownMessageKeys'),
      description: keys
        .map(({ key, suggestion }) =>
          suggestion ? t('configUnknownMessageKeySuggestion', { key, suggestion }) : key,
        )
        .join(', '),
    });
  }, [keys, notify, t]);

  return null;
}
