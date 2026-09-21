import { CorePlatformProvider } from 'ohs-player-web-core';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { PortalConfigContext } from '../config/portalConfigContext';
import { PortalRoutes } from '../routes/PortalRoutes';
import { ThemeModeProvider } from '../theme/ThemeModeProvider';
import type { ResolvedPortalHost } from './createPortalHost';
import { ExtensionsContext } from './extensionsContext';

export interface PortalHostProps {
  host: ResolvedPortalHost;
  layoutChildren?: ReactNode;
  children?: ReactNode;
}

/**
 * Renders the portal from a resolved host. `children` render inside the platform providers and
 * outside the router; `layoutChildren` render inside the frame for a signed-in session.
 */
export function PortalHost({
  host,
  layoutChildren,
  children,
}: Readonly<PortalHostProps>): React.ReactElement {
  return (
    <ThemeModeProvider>
      <PortalConfigContext.Provider value={host.portal}>
        <ExtensionsContext.Provider value={host.contributions}>
          <CorePlatformProvider config={host.portal.platform}>
            {children}
            <BrowserRouter>
              <PortalRoutes routes={host.routes} layoutChildren={layoutChildren} />
            </BrowserRouter>
          </CorePlatformProvider>
        </ExtensionsContext.Provider>
      </PortalConfigContext.Provider>
    </ThemeModeProvider>
  );
}
