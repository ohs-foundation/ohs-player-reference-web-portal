import { useAuth, useTranslation } from 'ohs-player-web-core';
import { Card, Page, Stack } from '../components/ui';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../layout/BrandMark';

export function LoginPage() {
  const auth = useAuth();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const onSignIn = (): void => {
    setSignInError(null);
    setBusy(true);
    void auth
      .login()
      .catch((e: unknown) => {
        setBusy(false);
        setSignInError(e instanceof Error ? e.message : String(e));
      });
  };

  return (
    <Page>
      <Stack gap={4} style={{ maxWidth: 440, margin: '0 auto', padding: '3rem 1rem' }}>
        <header style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <BrandMark size={40} />
          <h1 style={{ margin: 0, fontSize: 'var(--ohs-text-headline, 24px)' }}>{t('loginHeading')}</h1>
        </header>
        <Card>
          <Stack gap={3}>
            <p>{t('loginPrompt')}</p>
            {auth.error ? (
              <p role="alert" className="ohs-field__error">
                {auth.error.message}
              </p>
            ) : null}
            {signInError ? (
              <p role="alert" className="ohs-field__error">
                {signInError}
              </p>
            ) : null}
            {/* Native button: Material Web md-filled-button does not reliably receive React onClick in all browsers */}
            <button
              type="button"
              className="ohs-button"
              data-variant="primary"
              aria-label={t('signIn')}
              disabled={busy || auth.status === 'loading'}
              onClick={onSignIn}
            >
              {busy ? t('loading') : t('signIn')}
            </button>
            <p>
              <Link to="/">{t('backHome')}</Link>
            </p>
          </Stack>
        </Card>
      </Stack>
    </Page>
  );
}
