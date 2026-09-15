import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavEntry } from 'ohs-player-web-shell';

let flagsOff = new Set<string>();
let deniedPermissions = new Set<string>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: 'authenticated',
      user: { sub: 'u1', preferred_username: 'admin', email: 'admin@example.org' },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    }),
    useFlag: (flag: string) => !flagsOff.has(flag),
    usePermission: (permission: string) => ({ can: !deniedPermissions.has(permission) }),
  };
});

vi.mock('../features/search/useGlobalSearch', () => ({
  useGlobalSearch: () => ({ groups: [], loading: false, hasTerm: false }),
}));

vi.mock('../features/activity/useRecentActivity', () => ({
  useRecentActivity: () => ({ items: [], loading: false, error: null }),
}));

vi.mock('../features/setup-wizard/useSetupWizardAutoRedirect', () => ({
  useSetupWizardAutoRedirect: () => undefined,
}));

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { platformConfig, portalDefaults } = await import('../config/platform');
const { DEFAULT_NAVIGATION, PortalConfigContext, resolvePortalConfig } = await import(
  'ohs-player-web-shell'
);
const { AppLayout } = await import('./AppLayout');

function sidebarLinks(navigation?: NavEntry[]): (string | null)[] {
  render(
    <MemoryRouter>
      <CorePlatformProvider config={platformConfig}>
        <PortalConfigContext.Provider
          value={resolvePortalConfig(portalDefaults, navigation ? { navigation } : {})}
        >
          <AppLayout />
        </PortalConfigContext.Provider>
      </CorePlatformProvider>
    </MemoryRouter>,
  );
  return within(screen.getByLabelText('Primary navigation'))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));
}

describe('AppLayout sidebar', () => {
  beforeEach(() => {
    flagsOff = new Set();
    deniedPermissions = new Set();
  });

  it('renders the baked sidebar in order when no document is loaded', () => {
    expect(sidebarLinks()).toEqual([
      '/',
      '/users',
      '/locations',
      '/organizations',
      '/care-teams',
      '/resources',
      '/setup',
    ]);
  });

  it('orders the sidebar by the order values in the document', () => {
    const navigation = DEFAULT_NAVIGATION.map((entry) => {
      if (entry.id === 'users') return { ...entry, order: 30 };
      if (entry.id === 'locations') return { ...entry, order: 20 };
      return entry;
    });

    expect(sidebarLinks(navigation).slice(0, 3)).toEqual(['/', '/locations', '/users']);
  });

  it('hides an entry whose flag is off', () => {
    flagsOff = new Set(['orgMgmt']);

    expect(sidebarLinks()).not.toContain('/organizations');
  });

  it('hides an entry the user may not open', () => {
    deniedPermissions = new Set(['users.view']);

    expect(sidebarLinks()).not.toContain('/users');
  });

  it('shows an entry that requires neither a flag nor a permission', () => {
    deniedPermissions = new Set(['users.view']);

    expect(sidebarLinks([{ id: 'users', to: '/users', labelKey: 'navUsers', order: 10 }])).toEqual([
      '/users',
    ]);
  });
});
