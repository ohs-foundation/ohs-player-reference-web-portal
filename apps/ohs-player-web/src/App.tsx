import { applyTheme, CorePlatformProvider, defaultTheme, mergeTheme } from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { AppRoutes } from './AppRoutes';
import { ConfigErrorNotice } from './config/ConfigErrorNotice';
import { PortalConfigContext } from './config/portalConfigContext';
import type { ResolvedPortalConfig } from './config/resolvePortalConfig';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import { useThemeMode } from './theme/themeModeContext';
import { darkTheme } from './theme/darkTheme';

interface AppProps {
  portal: ResolvedPortalConfig;
  configError?: string;
}

function ThemedApp({ portal, configError }: Readonly<AppProps>) {
  const { mode } = useThemeMode();
  const theme = mode === 'dark' ? darkTheme : portal.platform.theme;
  const config = useMemo(() => ({ ...portal.platform, theme }), [portal.platform, theme]);

  // The provider applies tokens to [data-ohs-root]; also apply them to <html> so Radix portals
  // (drawers, dialogs, dropdowns, toasts) — which render outside that element — inherit the theme.
  useEffect(() => {
    applyTheme(mergeTheme(defaultTheme, theme), document.documentElement);
  }, [theme]);

  return (
    <PortalConfigContext.Provider value={portal}>
      <CorePlatformProvider config={config}>
        <ConfigErrorNotice error={configError} />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CorePlatformProvider>
    </PortalConfigContext.Provider>
  );
}

export default function App({ portal, configError }: Readonly<AppProps>) {
  return (
    <ThemeModeProvider>
      <ThemedApp portal={portal} configError={configError} />
    </ThemeModeProvider>
  );
}
