import { CorePlatformProvider } from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { ConfigErrorNotice } from './config/ConfigErrorNotice';
import { PortalConfigContext } from './config/portalConfigContext';
import type { ResolvedPortalConfig } from './config/resolvePortalConfig';
import { ThemeModeProvider } from './theme/ThemeModeProvider';

interface AppProps {
  portal: ResolvedPortalConfig;
  configError?: string;
}

export default function App({ portal, configError }: Readonly<AppProps>) {
  return (
    <ThemeModeProvider>
      <PortalConfigContext.Provider value={portal}>
        <CorePlatformProvider config={portal.platform}>
          <ConfigErrorNotice error={configError} />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CorePlatformProvider>
      </PortalConfigContext.Provider>
    </ThemeModeProvider>
  );
}
