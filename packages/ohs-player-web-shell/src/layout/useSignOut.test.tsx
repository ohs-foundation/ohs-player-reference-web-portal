import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logout = vi.fn().mockResolvedValue(undefined);

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: 'authenticated',
      user: { sub: 'u1' },
      login: vi.fn(),
      logout,
      getAccessToken: vi.fn(),
    }),
  };
});

const { useSignOut } = await import('./useSignOut');

function SignOutButton() {
  const signOut = useSignOut();
  return (
    <button type="button" onClick={signOut}>
      Sign out
    </button>
  );
}

function Landed() {
  const location = useLocation();
  return (
    <div data-testid="landed" data-path={location.pathname}>
      {(location.state as { signingOut?: boolean } | null)?.signingOut === true
        ? 'signing-out'
        : 'plain'}
    </div>
  );
}

function renderSignOut() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SignOutButton />} />
        <Route path="/logout" element={<Landed />} />
        <Route path="/login" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('useSignOut', () => {
  beforeEach(() => {
    logout.mockClear();
  });

  it('lands on the sign-out confirmation rather than flashing the login page', () => {
    renderSignOut();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByTestId('landed')).toHaveAttribute('data-path', '/logout');
  });

  it('marks the leg that precedes the provider redirect', () => {
    renderSignOut();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByTestId('landed')).toHaveTextContent('signing-out');
  });

  it('still ends the provider session', () => {
    renderSignOut();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
