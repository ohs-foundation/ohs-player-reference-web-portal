import { PortalHost, type ResolvedPortalHost } from 'ohs-player-web-shell';
import { ConfigErrorNotice } from './config/ConfigErrorNotice';
import { SetupWizardAutoRedirect } from './features/setup-wizard/SetupWizardAutoRedirect';

interface AppProps {
  host: ResolvedPortalHost;
  configError?: string;
}

export default function App({ host, configError }: Readonly<AppProps>) {
  return (
    <PortalHost host={host} layoutChildren={<SetupWizardAutoRedirect />}>
      <ConfigErrorNotice error={configError} />
    </PortalHost>
  );
}
