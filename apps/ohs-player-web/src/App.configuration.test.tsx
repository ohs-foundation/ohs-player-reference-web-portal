import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: 'authenticated',
      user: { sub: 'u1', preferred_username: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    }),
    usePermission: () => ({ can: true }),
    PermissionGuard: ({ children }: { children: ReactNode }) => children,
    useSearch: () => ({ data: undefined, isLoading: false, error: null }),
  };
});

const { createPortalHost } = await import('ohs-player-web-shell');
const { default: App } = await import('./App');
const { appRoutes } = await import('./AppRoutes');
const { portalDefaults } = await import('./config/platform');

describe('App', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('hands the document it booted with to the configuration page', async () => {
    window.history.pushState({}, '', '/configuration');
    window.localStorage.setItem('ohs-theme', 'light');
    const document = { product: { name: 'Kenya eCHIS' }, locale: 'sw' };
    const host = createPortalHost({
      defaults: portalDefaults,
      document,
      routes: appRoutes,
      development: true,
    });

    render(<App host={host} running={{ document, source: 'document' }} />);

    const editor = await screen.findByLabelText<HTMLTextAreaElement>('Document (JSON)');
    expect(JSON.parse(editor.value)).toEqual(document);
  });
});
