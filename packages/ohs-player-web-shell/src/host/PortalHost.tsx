import { CorePlatformProvider } from 'ohs-player-web-core';
import type { ComponentType, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { PortalConfigContext } from '../config/portalConfigContext';
import { UnknownMessageKeysNotice } from '../config/UnknownMessageKeysNotice';
import { PortalRoutes } from '../routes/PortalRoutes';
import { ThemeModeProvider } from '../theme/ThemeModeProvider';
import type { ResolvedPortalHost } from './createPortalHost';
import { ExtensionsContext } from './extensionsContext';

export interface PortalHostProps {
  host: ResolvedPortalHost;
  layoutChildren?: ReactNode;
  /**
   * Wraps the routes inside the router and the platform providers, so an application's own context
   * reaches every page, the frame and every slot contribution.
   */
  providers?: ComponentType<{ children: ReactNode }>;
  children?: ReactNode;
}

/**
 * Renders the portal from a resolved host. `children` render inside the platform providers and
 * outside the router. `layoutChildren` render inside the frame for a signed-in session. `providers`
 * wraps the routes.
 */
export function PortalHost({
  host,
  layoutChildren,
  providers: Providers,
  children,
}: Readonly<PortalHostProps>): React.ReactElement {
  const routes = <PortalRoutes routes={host.routes} layoutChildren={layoutChildren} />;
  return (
    <ThemeModeProvider>
      <PortalConfigContext.Provider value={host.portal}>
        <ExtensionsContext.Provider value={host.contributions}>
          <CorePlatformProvider config={host.portal.platform}>
            <UnknownMessageKeysNotice keys={host.unknownMessageKeys} />
            {children}
            <BrowserRouter>{Providers ? <Providers>{routes}</Providers> : routes}</BrowserRouter>
          </CorePlatformProvider>
        </ExtensionsContext.Provider>
      </PortalConfigContext.Provider>
    </ThemeModeProvider>
  );
}
