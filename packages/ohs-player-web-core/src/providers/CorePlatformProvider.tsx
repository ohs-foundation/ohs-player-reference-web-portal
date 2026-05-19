import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CorePlatformConfig, ThemeConfig } from '../types/config';
import { AuthProvider } from '../auth/AuthProvider';
import { FlagsProvider } from '../flags/FlagsProvider';
import { I18nProvider, useTranslation } from '../i18n/I18nProvider';
import { CoreConfigProvider } from '../providers/CoreConfigProvider';
import { FhirClientProvider } from '../providers/FhirClientProvider';
import { applyTheme, defaultTheme, mergeTheme } from '../theme/theme';
import { StatusBarProvider } from '../ui/primitives/StatusBar';

export function CorePlatformProvider({
  config,
  children,
}: {
  config: CorePlatformConfig;
  children: ReactNode;
}): React.ReactElement {
  const queryClient = useMemo(() => new QueryClient(), []);
  const mergedTheme = useMemo(
    () => mergeTheme(defaultTheme, config.theme),
    [config.theme],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CoreConfigProvider config={config}>
        <FlagsProvider config={config.flags}>
          <AuthProvider config={config.auth}>
            <I18nProvider config={config.i18n}>
              <ThemedRoot mergedTheme={mergedTheme}>
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

function ThemedRoot({
  mergedTheme,
  children,
}: {
  mergedTheme: ThemeConfig;
  children: ReactNode;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const { dir } = useTranslation();

  useEffect(() => {
    applyTheme(mergedTheme, ref.current);
  }, [mergedTheme]);

  return (
    <div ref={ref} data-ohs-root dir={dir} style={{ minHeight: '100%' }}>
      {children}
    </div>
  );
}
