import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { platformConfig } from '../config/platform';
import { LOGOUT_REDIRECT_MS, LogoutPage } from './LogoutPage';

function renderLogout(state?: { signingOut: boolean }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/logout', state }]}>
      <CorePlatformProvider config={platformConfig}>
        <Routes>
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </CorePlatformProvider>
    </MemoryRouter>,
  );
}

describe('LogoutPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms the sign-out before sending the user anywhere', () => {
    renderLogout();

    expect(screen.getByRole('status')).toHaveTextContent('You have been signed out');
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('lands on the login page once the confirmation has been read', () => {
    renderLogout();

    act(() => {
      vi.advanceTimersByTime(LOGOUT_REDIRECT_MS);
    });

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('holds still on the leg before the provider redirect, so the countdown is not wasted', () => {
    renderLogout({ signingOut: true });

    act(() => {
      vi.advanceTimersByTime(LOGOUT_REDIRECT_MS * 4);
    });

    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('You have been signed out');
  });
});
