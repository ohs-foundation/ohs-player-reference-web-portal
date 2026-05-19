import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { UserManager, type User } from 'oidc-client-ts';
import type { AuthConfig, UseAuthResult, UserProfile } from '../types/config';

const AuthContext = createContext<{
  auth: UseAuthResult;
  userManager: UserManager;
} | null>(null);

function mapOidcUser(u: User | null): UserProfile | null {
  if (!u?.profile) return null;
  const p = u.profile as Record<string, unknown>;
  return {
    sub: typeof p.sub === 'string' ? p.sub : undefined,
    name: typeof p.name === 'string' ? p.name : undefined,
    preferred_username:
      typeof p.preferred_username === 'string' ? p.preferred_username : undefined,
    email: typeof p.email === 'string' ? p.email : undefined,
  };
}

export function AuthProvider({
  config,
  children,
}: {
  config: AuthConfig;
  children: ReactNode;
}): React.ReactElement {
  const redirectUri =
    config.redirectUri ?? `${globalThis.window?.location?.origin ?? ''}/callback`;
  const scopes = config.scopes ?? ['openid', 'profile', 'email'];

  const userManager = useMemo(
    () =>
      new UserManager({
        authority: config.issuer.replace(/\/$/, ''),
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        automaticSilentRenew: true,
        includeIdTokenInSilentRenew: true,
      }),
    [config.clientId, config.issuer, redirectUri, scopes],
  );

  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<UseAuthResult['status']>('loading');
  const [error, setError] = useState<Error | null>(null);
  const onRefreshFail = useRef(config.onTokenRefreshFailure);
  useEffect(() => {
    onRefreshFail.current = config.onTokenRefreshFailure;
  }, [config.onTokenRefreshFailure]);

  useEffect(() => {
    let cancelled = false;
    void userManager
      .getUser()
      .then(async (u) => {
        if (cancelled) return;
        if (!u) {
          setStatus('unauthenticated');
          return;
        }
        setUser(u);
        if (!u.expired) {
          setStatus('authenticated');
          return;
        }
        try {
          const renewed = await userManager.signinSilent();
          if (cancelled) return;
          if (renewed) {
            setUser(renewed);
            setStatus('authenticated');
          } else {
            setStatus('unauthenticated');
          }
        } catch {
          if (!cancelled) setStatus('unauthenticated');
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        }
      });

    return (): void => {
      cancelled = true;
    };
  }, [userManager]);

  useEffect(() => {
    const fail = (): void => {
      const cb = onRefreshFail.current;
      void Promise.resolve(cb?.());
    };
    userManager.events.addSilentRenewError(fail);
    return (): void => {
      userManager.events.removeSilentRenewError(fail);
    };
  }, [userManager]);

  useEffect(() => {
    const onUserLoaded = (u: User): void => {
      setUser(u);
      setStatus('authenticated');
      setError(null);
    };
    const onUserUnloaded = (): void => {
      setUser(null);
      setStatus('unauthenticated');
    };
    userManager.events.addUserLoaded(onUserLoaded);
    userManager.events.addUserUnloaded(onUserUnloaded);
    return (): void => {
      userManager.events.removeUserLoaded(onUserLoaded);
      userManager.events.removeUserUnloaded(onUserUnloaded);
    };
  }, [userManager]);

  const login = useCallback(async (): Promise<void> => {
    await userManager.signinRedirect();
  }, [userManager]);

  const logout = useCallback(async (): Promise<void> => {
    await userManager.signoutRedirect();
  }, [userManager]);

  const handleRedirectCallback = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      const u = await userManager.signinRedirectCallback();
      setUser(u);
      setStatus('authenticated');
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
      throw e;
    }
  }, [userManager]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    let u = user ?? (await userManager.getUser());
    if (u?.expired && u) {
      try {
        u = await userManager.signinSilent();
      } catch {
        u = await userManager.getUser();
      }
    }
    return u?.access_token ?? null;
  }, [user, userManager]);

  const value = useMemo(
    (): { auth: UseAuthResult; userManager: UserManager } => ({
      userManager,
      auth: {
        status,
        user: mapOidcUser(user),
        error,
        login,
        logout,
        handleRedirectCallback,
        getAccessToken,
      },
    }),
    [userManager, status, user, error, login, logout, handleRedirectCallback, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): { auth: UseAuthResult; userManager: UserManager } {
  const c = useContext(AuthContext);
  if (!c) {
    throw new Error('CorePlatformProvider / AuthProvider is required for useAuth');
  }
  return c;
}

export function useAuth(): UseAuthResult {
  return useAuthContext().auth;
}
