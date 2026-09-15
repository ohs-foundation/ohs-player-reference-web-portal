import { useStatusBar, useTranslation } from 'ohs-player-web-core';
import { useEffect, useRef } from 'react';

export function ConfigErrorNotice({ error }: Readonly<{ error?: string }>): null {
  const status = useStatusBar();
  const { t } = useTranslation();
  const shown = useRef(false);

  useEffect(() => {
    if (!error || shown.current) return;
    shown.current = true;
    status.notify({ tone: 'error', title: t('configDocumentInvalid'), description: error });
  }, [error, status, t]);

  return null;
}
