import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CallbackPage } from './CallbackPage';
import { resetOidcCallbackGuardForTests } from './callbackOidcGuard';

const mockUseAuth = vi.fn();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual('ohs-player-web-core');
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('invalid module');
  }
  return {
    ...actual,
    useAuth: (): object => mockUseAuth() as object,
  };
});

describe('CallbackPage', () => {
  beforeEach(() => {
    resetOidcCallbackGuardForTests();
    mockUseAuth.mockReset();
  });

  it('calls handleRedirectCallback exactly once under StrictMode remount', async () => {
    const handleRedirectCallback = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      status: 'loading',
      user: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      handleRedirectCallback,
      getAccessToken: vi.fn(),
    });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/callback']}>
          <Routes>
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/" element={<div>Home</div>} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => expect(handleRedirectCallback).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(handleRedirectCallback).toHaveBeenCalledTimes(1);
  });
});
