import { useAuth, useTranslation } from 'ohs-player-web-core';
import { useState } from 'react';
import { Button, Card, Stack } from '../components/ui';
import { BrandMark } from '../layout/BrandMark';
import loginBackground from '../assets/illustrations/login-bg.svg';

export function LoginPage() {
  const auth = useAuth();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const onSignIn = (): void => {
    setSignInError(null);
    setBusy(true);
    void auth.login().catch((e: unknown) => {
      setBusy(false);
      setSignInError(e instanceof Error ? e.message : String(e));
    });
  };

  const error = auth.error?.message ?? signInError;
  // `busy` is user-initiated sign-in (drives the spinner/aria-busy + "Loading…" label). The initial
  // OIDC session check (`auth.status === 'loading'`) only disables the button — it must not flip the
  // label to "Loading…" or mark it aria-busy before the user has acted.
  const disabled = busy || auth.status === 'loading';

  return (
    <div className="ohs-login">
      <div
        className="ohs-login__bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${loginBackground})` }}
      />
      <Card className="ohs-login__card">
        <Stack gap={5}>
          <Stack gap={2}>
            <h1 className="ohs-login__title">{t('loginHeading')}</h1>
            <p className="ohs-login__subtitle">{t('loginSubtitle')}</p>
          </Stack>

          {error ? (
            <p role="alert" className="ohs-field__error">
              {error}
            </p>
          ) : null}

          <Button
            variant="primary"
            className="ohs-login__submit"
            loading={busy}
            disabled={disabled}
            onClick={onSignIn}
          >
            {busy ? t('loading') : t('signIn')}
          </Button>

          <div className="ohs-login__brand">
            <BrandMark size={32} />
            <span className="ohs-login__wordmark">{t('appTopbarTitle')}</span>
          </div>
        </Stack>
      </Card>
    </div>
  );
}
