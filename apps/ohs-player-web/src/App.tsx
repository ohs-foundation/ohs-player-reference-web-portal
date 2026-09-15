import { CorePlatformProvider } from 'ohs-player-web-core';
import { BrowserRouter } from 'react-router-dom';
import { platformConfig } from './config/platform';
import { AppRoutes } from './AppRoutes';
import { ThemeModeProvider } from './theme/ThemeModeProvider';

export default function App() {
  return (
    <ThemeModeProvider>
      <CorePlatformProvider config={platformConfig}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CorePlatformProvider>
    </ThemeModeProvider>
  );
}
