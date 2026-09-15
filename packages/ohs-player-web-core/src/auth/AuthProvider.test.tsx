import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const constructorArgs: Record<string, unknown>[] = [];

vi.mock('oidc-client-ts', () => ({
  UserManager: class {
    events = {
      addSilentRenewError: vi.fn(),
      removeSilentRenewError: vi.fn(),
      addUserLoaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
    };
    constructor(settings: Record<string, unknown>) {
      constructorArgs.push(settings);
    }
    getUser = vi.fn().mockResolvedValue(null);
  },
}));

const { AuthProvider } = await import('./AuthProvider');

describe('AuthProvider OIDC settings', () => {
  it('gives the provider somewhere to return to after logout', () => {
    render(
      <AuthProvider
        config={{ issuer: 'https://idp.example.org/realms/ohs', clientId: 'ohs-player-web' }}
      >
        <span />
      </AuthProvider>,
    );

    const settings = constructorArgs.at(-1);
    expect(settings?.post_logout_redirect_uri).toBe(`${window.location.origin}/logout`);
  });

  it('honours an explicit postLogoutRedirectUri', () => {
    render(
      <AuthProvider
        config={{
          issuer: 'https://idp.example.org/realms/ohs',
          clientId: 'ohs-player-web',
          postLogoutRedirectUri: 'https://ohs.example.org/bye',
        }}
      >
        <span />
      </AuthProvider>,
    );

    expect(constructorArgs.at(-1)?.post_logout_redirect_uri).toBe('https://ohs.example.org/bye');
  });
});
