import { useAuth } from 'ohs-player-web-core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isOidcCallbackAlreadyStarted, markOidcCallbackStarted } from './callbackOidcGuard';

export function CallbackPage() {
  const { handleRedirectCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOidcCallbackAlreadyStarted()) return;
    markOidcCallbackStarted();

    void (async (): Promise<void> => {
      try {
        await handleRedirectCallback();
        void navigate('/', { replace: true });
      } catch {
        void navigate('/login', { replace: true });
      }
    })();
  }, [navigate, handleRedirectCallback]);

  return <p style={{ padding: '1rem' }}>Completing sign-in…</p>;
}
