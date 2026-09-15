import { CorePlatformProvider } from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import {
  PortalConfigContext,
  PortalRoutes,
  ThemeModeProvider,
  type ResolvedPortalConfig,
} from 'ohs-player-web-shell';
import { appRoutes } from './AppRoutes';
import { ConfigErrorNotice } from './config/ConfigErrorNotice';
import { SetupWizardAutoRedirect } from './features/setup-wizard/SetupWizardAutoRedirect';

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
            <PortalRoutes routes={appRoutes} layoutChildren={<SetupWizardAutoRedirect />} />
          </BrowserRouter>
        </CorePlatformProvider>
      </PortalConfigContext.Provider>
    </ThemeModeProvider>
  );
}
