import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `color-contrast` is enabled for intent, but axe cannot evaluate it under jsdom (no layout engine —
 * it returns `incomplete`, never a violation). `pnpm contrast:check` is the real contrast gate.
 */
const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: true } } };
const BLOCKING = new Set(['serious', 'critical']);

let authStatus: 'authenticated' | 'unauthenticated' = 'unauthenticated';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: authStatus,
      user: { sub: 'u1', preferred_username: 'admin', email: 'admin@example.org' },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    }),
    useFlag: () => true,
    usePermission: () => ({ can: true }),
  };
});

vi.mock('./features/search/useGlobalSearch', () => ({
  useGlobalSearch: () => ({ groups: [], loading: false, hasTerm: false }),
}));

vi.mock('./features/activity/useRecentActivity', () => ({
  useRecentActivity: () => ({ items: [], loading: false, error: null }),
}));

vi.mock('./features/setup-wizard/useSetupWizardAutoRedirect', () => ({
  useSetupWizardAutoRedirect: () => undefined,
}));

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { platformConfig } = await import('./config/platform');
const { LoginPage } = await import('./pages/LoginPage');
const { AppLayout } = await import('./layout/AppLayout');

function renderShell() {
  authStatus = 'authenticated';
  return render(
    <MemoryRouter>
      <CorePlatformProvider config={platformConfig}>
        <AppLayout />
      </CorePlatformProvider>
    </MemoryRouter>,
  );
}

describe('a11y', () => {
  beforeEach(() => {
    authStatus = 'unauthenticated';
  });

  it('login page has no serious or critical axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <CorePlatformProvider config={platformConfig}>
          <LoginPage />
        </CorePlatformProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/^Sign in$/i)).toBeInTheDocument();
    const result = await axe(container, AXE_OPTIONS);
    expect(result.violations.filter((v) => BLOCKING.has(v.impact ?? ''))).toEqual([]);
  });

  it('authenticated app shell has no serious or critical axe violations', async () => {
    const { container } = renderShell();
    const result = await axe(container, AXE_OPTIONS);
    expect(result.violations.filter((v) => BLOCKING.has(v.impact ?? ''))).toEqual([]);
  });

  it('app shell exposes a skip link targeting the main pane', () => {
    renderShell();

    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveAttribute('href', '#main-content');

    const main = document.getElementById('main-content');
    expect(main?.tagName).toBe('MAIN');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('keeps every nav destination reachable and named when railed', () => {
    const { container } = renderShell();
    const expanded = Array.from(container.querySelectorAll('.app-sidebar__link')).map(
      (el) => el.textContent,
    );

    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    const aside = container.querySelector('.app-sidebar');
    expect(aside).toHaveAttribute('data-collapsed', 'true');

    const railed = Array.from(container.querySelectorAll('.app-sidebar__link'));
    expect(railed.map((el) => el.textContent)).toEqual(expanded);
    expect(railed.length).toBeGreaterThan(0);
    for (const link of railed) {
      expect(link).not.toHaveAttribute('aria-hidden');
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });

  it('rail has no serious or critical axe violations', async () => {
    const { container } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    const result = await axe(container, AXE_OPTIONS);
    expect(result.violations.filter((v) => BLOCKING.has(v.impact ?? ''))).toEqual([]);
  });

  it('places the skip link before every other focusable element', () => {
    const { container } = renderShell();

    const focusable = container.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])');
    expect(focusable[0]).toHaveClass('app-skip-link');
  });
});
