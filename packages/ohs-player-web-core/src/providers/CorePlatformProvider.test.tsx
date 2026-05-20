import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorePlatformProvider } from './CorePlatformProvider';
import { useCoreConfig } from './CoreConfigProvider';
import { useFlag } from '../flags/FlagsProvider';
import { useTranslation } from '../i18n/I18nProvider';
import type { CorePlatformConfig } from '../types/config';

vi.mock('oidc-client-ts', () => {
  const UserManager = vi.fn().mockImplementation(() => ({
    events: {
      addUserLoaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
      addSilentRenewError: vi.fn(),
      removeSilentRenewError: vi.fn(),
      addAccessTokenExpired: vi.fn(),
      removeAccessTokenExpired: vi.fn(),
    },
    getUser: vi.fn().mockResolvedValue(null),
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
    removeUser: vi.fn(),
  }));
  return { UserManager };
});

const config: CorePlatformConfig = {
  fhirBaseUrl: 'https://fhir.example.com/fhir',
  auth: {
    issuer: 'https://auth.example.com/realms/test',
    clientId: 'test-client',
    redirectUri: 'http://localhost:3000/callback',
  },
  flags: { flags: { dashboard: true, search: false } },
  i18n: {},
  rbac: { permissionMap: {}, claimPath: 'realm_access.roles' },
};

function Probe(): React.ReactElement {
  const { fhirBaseUrl } = useCoreConfig();
  const dashboardOn = useFlag('dashboard');
  const searchOn = useFlag('search');
  const { t } = useTranslation();
  return (
    <div>
      <span data-testid="fhir-url">{fhirBaseUrl}</span>
      <span data-testid="flag-dashboard">{String(dashboardOn)}</span>
      <span data-testid="flag-search">{String(searchOn)}</span>
      <span data-testid="t-search">{t('search')}</span>
    </div>
  );
}

function Wrapper({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <CorePlatformProvider config={config}>{children}</CorePlatformProvider>;
}

describe('CorePlatformProvider', () => {
  it('renders children', () => {
    render(<Wrapper><span data-testid="child" /></Wrapper>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('useCoreConfig returns fhirBaseUrl', () => {
    render(<Wrapper><Probe /></Wrapper>);
    expect(screen.getByTestId('fhir-url').textContent).toBe('https://fhir.example.com/fhir');
  });

  it('useFlag returns correct values', () => {
    render(<Wrapper><Probe /></Wrapper>);
    expect(screen.getByTestId('flag-dashboard').textContent).toBe('true');
    expect(screen.getByTestId('flag-search').textContent).toBe('false');
  });

  it('useTranslation t("search") returns "Search"', () => {
    render(<Wrapper><Probe /></Wrapper>);
    expect(screen.getByTestId('t-search').textContent).toBe('Search');
  });
});
