import { RiLockLine } from '@remixicon/react';
import { useAuth, useTranslation } from 'ohs-player-web-core';
import { Button, EmptyState, Inline, StatusBadge } from '../../components/ui';

export interface LocationsNoAccessProps {
  /** 401 = unauthenticated, 403 = authenticated but missing `location-hierarchy.view`. */
  status: 401 | 403;
}

/**
 * No-access state for the location hierarchy. Reached two ways: the RBAC route guard (permission denied →
 * 403) and a live 401/403 from the hierarchy API. A 403 in dev may also mean the granular role wasn't seeded
 * into Keycloak (roles reset on realm reimport).
 */
export function LocationsNoAccess({ status }: Readonly<LocationsNoAccessProps>): React.ReactElement {
  const { t } = useTranslation();
  const { login } = useAuth();
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
          <Button variant="outlined" type="button" onClick={() => void login()}>
            {t('locationsSwitchAccount')}
          </Button>
          <Button variant="outlined" type="button" disabled>
            {t('locationsRequestAccess')}
          </Button>
        </Inline>
      }
    />
  );
}
