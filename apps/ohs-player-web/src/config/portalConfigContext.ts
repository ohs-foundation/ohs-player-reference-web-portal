import { createContext, useContext } from 'react';
import { resolvePortalConfig, type ResolvedPortalConfig } from './resolvePortalConfig';

export const PortalConfigContext = createContext<ResolvedPortalConfig>(resolvePortalConfig());

export function usePortalConfig(): ResolvedPortalConfig {
  return useContext(PortalConfigContext);
}
