import { applyTheme, CorePlatformProvider, defaultTheme, mergeTheme } from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { platformConfig } from './config/platform';
import { AppRoutes } from './AppRoutes';
import { ThemeModeProvider } from './theme/ThemeModeProvider';

function ThemedApp() {
  // The provider applies tokens to [data-ohs-root]; also apply them to <html> so Radix portals
  // (drawers, dialogs, dropdowns, toasts) — which render outside that element — inherit the theme.
  useEffect(() => {
    applyTheme(mergeTheme(defaultTheme, platformConfig.theme), document.documentElement);
  }, []);

  return (
    <CorePlatformProvider config={platformConfig}>
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
