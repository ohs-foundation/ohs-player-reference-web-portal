import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installThemeCss } from 'ohs-player-web-core';
import App from './App';
import { loadPortalConfig } from './config/loadPortalConfig';
import { portalDefaults } from './config/platform';
import { resolvePortalConfig } from 'ohs-player-web-shell';
import '@fontsource/google-sans/400.css';
import '@fontsource/google-sans/500.css';
import '@fontsource/google-sans-code/400.css';
import 'ohs-player-web-core/styles.css';
import 'ohs-player-web-shell/theme.css';
import './index.css';
import 'ohs-player-web-shell/tailwind.css';

void loadPortalConfig().then(({ document: configDocument, error }) => {
  const portal = resolvePortalConfig(portalDefaults, configDocument);
  if (error) portal.platform.onError?.(new Error(error));

  // Before render, not in an effect: utilities and hand CSS read these tokens on the first paint.
  installThemeCss(portal.theme);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App portal={portal} configError={import.meta.env.DEV ? error : undefined} />
    </StrictMode>,
  );
});
