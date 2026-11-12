import { useCallback, useEffect, useRef, useState } from 'react';
import { installThemeCss } from 'ohs-player-web-core';
import { resolvePortalConfig, usePortalConfig } from 'ohs-player-web-shell';
import { portalDefaults } from '../../config/platform';
import type { PortalConfig } from '../../config/portalConfigSchema';

export interface ConfigPreview {
  document?: PortalConfig;
  start: (document: PortalConfig) => void;
  end: () => void;
}

export function useConfigPreview(): ConfigPreview {
  const { theme } = usePortalConfig();
  const [document, setDocument] = useState<PortalConfig>();
  const active = useRef(false);

  const start = useCallback((next: PortalConfig) => {
    active.current = true;
    installThemeCss(resolvePortalConfig(portalDefaults, { brand: next.brand }).theme);
    setDocument(next);
  }, []);

  const end = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    installThemeCss(theme);
    setDocument(undefined);
  }, [theme]);

  useEffect(() => {
    const previewing = active;
    return () => {
      if (previewing.current) installThemeCss(theme);
    };
  }, [theme]);

  return { document, start, end };
}
