import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installThemeCss } from 'ohs-player-web-core';
import { createPortalHost, PortalHost } from 'ohs-player-web-shell';
import { appRoutes } from './AppRoutes';
import { loadPortalConfig } from './config/loadPortalConfig';
import { portalDefaults } from './config/platform';
import { extensions } from './extensions';
import '@fontsource/google-sans/400.css';
import '@fontsource/google-sans/500.css';
import '@fontsource/google-sans-code/400.css';
import 'ohs-player-web-core/styles.css';
import 'ohs-player-web-shell/theme.css';
import 'ohs-player-web-shell/index.css';
import 'ohs-player-web-shell/tailwind.css';

void loadPortalConfig().then(({ document: configDocument, error }) => {
  const host = createPortalHost({
    defaults: portalDefaults,
    document: configDocument,
    extensions,
    routes: appRoutes,
    development: import.meta.env.DEV,
  });
  if (error) host.portal.platform.onError?.(new Error(error));

  installThemeCss(host.portal.theme);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PortalHost host={host} />
    </StrictMode>,
  );
});
