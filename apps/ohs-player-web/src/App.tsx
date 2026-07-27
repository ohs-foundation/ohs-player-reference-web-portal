import {
  applyTheme,
  CorePlatformProvider,
  defaultTheme,
  installThemeCss,
  mergeTheme,
} from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { platformConfig } from './config/platform';
import { AppRoutes } from './AppRoutes';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import { useThemeMode } from './theme/themeModeContext';
import { darkTheme } from './theme/darkTheme';
import { sysTheme } from './theme/sysTheme';

function ThemedApp() {
  const { mode } = useThemeMode();
  const theme = mode === 'dark' ? darkTheme : platformConfig.theme;
  const config = useMemo(() => ({ ...platformConfig, theme }), [theme]);

  // The provider applies tokens to [data-ohs-root]; also apply them to <html> so Radix portals
  // (drawers, dialogs, dropdowns, toasts) — which render outside that element — inherit the theme.
  useEffect(() => {
    applyTheme(mergeTheme(defaultTheme, theme), document.documentElement);
  }, [theme]);

  // Mode-independent: the sys layer carries both schemes and flips on `data-theme`.
  useEffect(() => {
    installThemeCss(sysTheme);
  }, []);

  return (
    <CorePlatformProvider config={config}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CorePlatformProvider>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}
