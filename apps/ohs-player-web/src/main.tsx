import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installThemeCss } from 'ohs-player-web-core';
import App from './App';
import { sysTheme } from './theme/sysTheme';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import 'ohs-player-web-core/styles.css';
import './components/ui/theme.css';
import './index.css';
import './tailwind.css';

// Before render, not in an effect: utilities and hand CSS read these tokens on the first paint.
installThemeCss(sysTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
