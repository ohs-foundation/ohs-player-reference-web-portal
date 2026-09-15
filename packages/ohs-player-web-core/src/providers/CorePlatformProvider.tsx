import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import type { CorePlatformConfig } from '../types/config';
import { AuthProvider } from '../auth/AuthProvider';
import { FlagsProvider } from '../flags/FlagsProvider';
import { I18nProvider, useTranslation } from '../i18n/I18nProvider';
import { CoreConfigProvider } from '../providers/CoreConfigProvider';
import { FhirClientProvider } from '../providers/FhirClientProvider';
import { StatusBarProvider } from '../ui/primitives/StatusBar';

export function CorePlatformProvider({
  config,
  children,
}: {
  config: CorePlatformConfig;
  children: ReactNode;
}): React.ReactElement {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <CoreConfigProvider config={config}>
        <FlagsProvider config={config.flags}>
          <AuthProvider config={config.auth}>
            <I18nProvider config={config.i18n}>
              <ThemedRoot>
                <StatusBarProvider>
                  <FhirClientProvider>{children}</FhirClientProvider>
                </StatusBarProvider>
              </ThemedRoot>
            </I18nProvider>
          </AuthProvider>
        </FlagsProvider>
      </CoreConfigProvider>
    </QueryClientProvider>
  );
}

function ThemedRoot({ children }: { children: ReactNode }): React.ReactElement {
  const { dir } = useTranslation();

  return (
    <div data-ohs-root dir={dir} style={{ minHeight: '100%' }}>
      {children}
    </div>
  );
}
