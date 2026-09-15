import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let authStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'authenticated';
let flagsOff = new Set<string>();
let deniedPermissions = new Set<string>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({ status: authStatus }),
    useTranslation: () => ({ t: (key: string) => key }),
    FeatureGuard: ({ flag, children }: { flag: string; children: ReactNode }) =>
      flagsOff.has(flag) ? null : children,
    PermissionGuard: ({
      permission,
      fallback,
      children,
    }: {
      permission: string;
      fallback?: ReactNode;
      children: ReactNode;
    }) => (deniedPermissions.has(permission) ? (fallback ?? null) : children),
  };
});

const { ProtectedRoute } = await import('./ProtectedRoute');

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <Routes>
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              flag="reports"
              permission="reports.view"
              permissionFallback={<p>No access</p>}
            >
              <p>Reports page</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<p>Sign-in page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute gate order: flag, then session, then permission', () => {
  beforeEach(() => {
    authStatus = 'authenticated';
    flagsOff = new Set();
    deniedPermissions = new Set();
  });

  it('renders nothing for a flagged-off route, even before sign-in', () => {
    authStatus = 'unauthenticated';
    flagsOff = new Set(['reports']);
    renderGuarded();

    expect(screen.queryByText('Sign-in page')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports page')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign-in once the flag is on', () => {
    authStatus = 'unauthenticated';
    renderGuarded();

    expect(screen.getByText('Sign-in page')).toBeInTheDocument();
  });

  it('shows the session spinner while the session is loading', () => {
    authStatus = 'loading';
    renderGuarded();

    expect(screen.getByRole('status', { name: 'loadingSession' })).toBeInTheDocument();
  });

  it('checks the permission last, rendering the fallback when it is denied', () => {
    deniedPermissions = new Set(['reports.view']);
    renderGuarded();

    expect(screen.getByText('No access')).toBeInTheDocument();
    expect(screen.queryByText('Reports page')).not.toBeInTheDocument();
  });

  it('renders the page when the flag is on, the session is signed in and the permission is held', () => {
    renderGuarded();

    expect(screen.getByText('Reports page')).toBeInTheDocument();
  });
});
