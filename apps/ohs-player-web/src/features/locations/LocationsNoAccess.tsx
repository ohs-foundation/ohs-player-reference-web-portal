import { RiLockLine } from '@remixicon/react';
import { useAuth, useTranslation } from 'ohs-player-web-core';
import { Button, EmptyState, Inline, StatusBadge } from '../../components/ui';

export interface LocationsNoAccessProps {
  /** 401 = valid token rejected (intermittent gateway bug, retryable) or unauthenticated; 403 = missing role. */
  status: 401 | 403;
  onRetry?: () => void;
}

/** 401 is often the gateway's intermittent token bug (see useLocationHierarchy), so Retry is prominent. */
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
