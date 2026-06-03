import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { FhirClient } from '../client/FhirClient';
import { useAuth } from '../auth/AuthProvider';
import { useCoreConfig } from '../providers/CoreConfigProvider';

const FhirClientCtx = createContext<FhirClient | null>(null);

export function FhirClientProvider({ children }: { children: ReactNode }): React.ReactElement {
  const auth = useAuth();
  const { fhirBaseUrl, customEndpoints, onError } = useCoreConfig();

  const endpoints = useMemo(
    () => ({ ...(customEndpoints ?? {}) }),
    [customEndpoints],
  );

  const client = useMemo(
    () =>
      new FhirClient(
        fhirBaseUrl,
        endpoints,
        () => auth.getAccessToken(),
        onError,
      ),
    [auth, endpoints, fhirBaseUrl, onError],
  );

  return <FhirClientCtx.Provider value={client}>{children}</FhirClientCtx.Provider>;
}

export function useFhirClient(): FhirClient {
  const c = useContext(FhirClientCtx);
  if (!c) throw new Error('FhirClientProvider / CorePlatformProvider is required');
  return c;
}
