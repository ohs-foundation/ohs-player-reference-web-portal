import { useTranslation } from 'ohs-player-web-core';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, Stack } from 'ohs-player-web-shell';
import { BrandMark } from '../layout/BrandMark';
import loginBackground from '../assets/illustrations/login-bg.svg';

export const LOGOUT_REDIRECT_MS = 1500;

// Rendered before the provider redirect (signingOut) and again on return; only the return leg counts down.
export function LogoutPage(): React.ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const signingOut = (location.state as { signingOut?: boolean } | null)?.signingOut === true;
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (signingOut) return undefined;
    const id = setTimeout(() => setDone(true), LOGOUT_REDIRECT_MS);
    return () => clearTimeout(id);
  }, [signingOut]);

  if (done) return <Navigate to="/login" replace />;

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
            <h1 className="ohs-login__title" role="status">
              {t('logoutHeading')}
            </h1>
            <p className="ohs-login__subtitle ohs-login__redirecting">
              <span className="ohs-spinner" aria-hidden="true" />
              <span>{t('logoutRedirecting')}</span>
            </p>
          </Stack>

          <div className="ohs-login__brand">
            <BrandMark size={32} />
            <span className="ohs-login__wordmark">{t('appTopbarTitle')}</span>
          </div>
        </Stack>
      </Card>
    </div>
  );
}
