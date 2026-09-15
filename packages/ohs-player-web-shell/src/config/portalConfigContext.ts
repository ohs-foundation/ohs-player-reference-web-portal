import { createContext, useContext } from 'react';
import type { ResolvedPortalConfig } from './resolvePortalConfig';

export const PortalConfigContext = createContext<ResolvedPortalConfig | null>(null);

/** The resolved portal configuration. Throws outside a `PortalConfigContext` provider. */
export function usePortalConfig(): ResolvedPortalConfig {
  const config = useContext(PortalConfigContext);
  if (!config) throw new Error('usePortalConfig needs a PortalConfigContext provider');
  return config;
}
