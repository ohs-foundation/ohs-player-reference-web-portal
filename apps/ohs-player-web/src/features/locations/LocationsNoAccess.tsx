import { RiLockLine } from '@remixicon/react';
import { useAuth, useTranslation } from 'ohs-player-web-core';
import { Button, EmptyState, Inline, StatusBadge } from '../../components/ui';

export interface LocationsNoAccessProps {
  /** 401 = valid token rejected (intermittent gateway bug, retryable) or unauthenticated; 403 = missing role. */
  status: 401 | 403;
  /** Retry the hierarchy fetch (re-mints the token). Present when reached via a live API error, not the route guard. */
  onRetry?: () => void;
}

/**
 * No-access / auth-failure state. Reached via the RBAC route guard (403) or a live 401/403 from the API.
 * A 401 here is often the intermittent gateway "Invalid or expired token" bug (see useLocationHierarchy), so
 * Retry is prominent and re-requests with a fresh token before the user concludes they lack access. A 403 may
 * also mean the granular role isn't seeded (demo realm resets on reimport), so the copy mentions requesting it.
 */
export function LocationsNoAccess({ status, onRetry }: Readonly<LocationsNoAccessProps>): React.ReactElement {
  const { t } = useTranslation();
  const { login } = useAuth();
  const retryable = status === 401 && Boolean(onRetry);

  return (
    <EmptyState
      icon={<RiLockLine size={28} />}
      title={
        <Inline justify="start">
          <span>{t('locationsNoAccessTitle')}</span>
          <StatusBadge tone="error">{String(status)}</StatusBadge>
        </Inline>
      }
      description={t('locationsNoAccessDescription')}
      action={
        <Inline justify="start">
          {onRetry ? (
            <Button variant={retryable ? 'primary' : 'outlined'} type="button" onClick={onRetry}>
              {t('retry')}
            </Button>
          ) : null}
          <Button variant="outlined" type="button" onClick={() => void login()}>
            {t('locationsSwitchAccount')}
          </Button>
        </Inline>
      }
    />
  );
}
