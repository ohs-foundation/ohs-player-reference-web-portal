import { PortalHost, type ResolvedPortalHost } from 'ohs-player-web-shell';
import { ConfigErrorNotice } from './config/ConfigErrorNotice';
import type { LoadedPortalConfig } from './config/loadPortalConfig';
import { RunningConfigContext } from './features/configuration/RunningConfigContext';
import { SetupWizardAutoRedirect } from './features/setup-wizard/SetupWizardAutoRedirect';

interface AppProps {
  host: ResolvedPortalHost;
  running: LoadedPortalConfig;
  configError?: string;
}

export default function App({ host, running, configError }: Readonly<AppProps>) {
  return (
    <RunningConfigContext.Provider value={running}>
      <PortalHost host={host} layoutChildren={<SetupWizardAutoRedirect />}>
        <ConfigErrorNotice error={configError} />
      </PortalHost>
    </RunningConfigContext.Provider>
  );
}
