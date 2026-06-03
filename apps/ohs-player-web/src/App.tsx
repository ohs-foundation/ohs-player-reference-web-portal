import { CorePlatformProvider } from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import { platformConfig } from './config/platform';
import { AppRoutes } from './AppRoutes';

export default function App() {
  return (
    <CorePlatformProvider config={platformConfig}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CorePlatformProvider>
  );
}
