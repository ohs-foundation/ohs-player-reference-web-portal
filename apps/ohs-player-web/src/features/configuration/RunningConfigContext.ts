import { createContext, useContext } from 'react';
import type { LoadedPortalConfig } from '../../config/loadPortalConfig';

export const RunningConfigContext = createContext<LoadedPortalConfig | null>(null);

export function useRunningConfig(): LoadedPortalConfig {
  const running = useContext(RunningConfigContext);
  if (!running) throw new Error('useRunningConfig needs a RunningConfigContext provider');
  return running;
}
