import { render, screen, within } from '@testing-library/react';
import type { ExtensionNavEntry } from 'ohs-player-web-core';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavEntry } from '../config/navigation';

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

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { testPlatformConfig, testPortalDefaults } = await import('../test/testPlatformConfig');
const { DEFAULT_NAVIGATION } = await import('../config/navigation');
const { PortalConfigContext } = await import('../config/portalConfigContext');
const { resolvePortalConfig } = await import('../config/resolvePortalConfig');
const { ExtensionsContext } = await import('../host/extensionsContext');
const { AppLayout } = await import('./AppLayout');

interface LayoutOptions {
  navigation?: NavEntry[];
  extensionNav?: ExtensionNavEntry[];
  path?: string;
}

function renderSidebar({
  navigation,
  extensionNav = [],
  path = '/',
}: LayoutOptions = {}): HTMLElement {
  render(
    <MemoryRouter initialEntries={[path]}>
      <CorePlatformProvider config={testPlatformConfig}>
        <PortalConfigContext.Provider
          value={resolvePortalConfig(testPortalDefaults, navigation ? { navigation } : {})}
        >
          <ExtensionsContext.Provider
            value={{ nav: extensionNav, routes: [], widgets: [], slots: [], questionnaires: {} }}
          >
            <AppLayout />
          </ExtensionsContext.Provider>
        </PortalConfigContext.Provider>
      </CorePlatformProvider>
    </MemoryRouter>,
  );
  return screen.getByLabelText('Primary navigation');
}

function sidebarLinks(navigation?: NavEntry[]): (string | null)[] {
  return within(renderSidebar({ navigation }))
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
      '/audit',
    ]);
  });

  it('hides the audit log when its flag is off', () => {
    flagsOff = new Set(['auditLog']);
    expect(sidebarLinks()).not.toContain('/audit');
  });

  it('hides the audit log from a user without audit.view', () => {
    deniedPermissions = new Set(['audit.view']);
    expect(sidebarLinks()).not.toContain('/audit');
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

  it('marks only the current route as the active row', () => {
    const links = within(renderSidebar({ path: '/users' })).getAllByRole('link');
    const active = links.filter((link) => link.classList.contains('app-sidebar__link--active'));

    expect(active.map((link) => link.getAttribute('href'))).toEqual(['/users']);
    expect(active[0]).toHaveAttribute('aria-current', 'page');
    expect(links.find((link) => link.getAttribute('href') === '/')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('sorts extension entries among the built-in rows by order', () => {
    const extensionNav: ExtensionNavEntry[] = [
      { id: 'reports.list', to: '/reports', labelKey: 'navReports', order: 25 },
    ];
    const hrefs = within(renderSidebar({ extensionNav }))
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs.slice(0, 4)).toEqual(['/', '/users', '/reports', '/locations']);
  });

  it('puts an extension entry that shares the audit log order after the built-in entry', () => {
    const extensionNav: ExtensionNavEntry[] = [
      { id: 'reports.list', to: '/reports', labelKey: 'navReports', order: 80 },
    ];
    const hrefs = within(renderSidebar({ extensionNav }))
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs.slice(-2)).toEqual(['/audit', '/reports']);
  });

  it('renders every row as a focusable full-row link with a label and an icon', () => {
    const links = within(renderSidebar()).getAllByRole('link');

    for (const link of links) {
      link.focus();
      expect(link).toHaveFocus();
      expect(link).toHaveClass('app-sidebar__link', 'ohs-state-layer');
      expect(link.querySelector('.app-sidebar__icon svg')).toHaveAttribute('width', '24');
      expect(link.querySelector('.app-sidebar__label')?.textContent).not.toBe('');
    }
  });

  it('has no critical a11y violations', async () => {
    const sidebar = renderSidebar({ path: '/users' });

    const result = await axe(sidebar, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
