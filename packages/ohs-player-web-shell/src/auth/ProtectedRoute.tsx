import {
  FeatureGuard,
  PermissionGuard,
  useAuth,
  useTranslation,
} from 'ohs-player-web-core';
import { Page, Spinner } from '../components/ui';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface SessionGateProps {
  permission?: string;
  /** Rendered when authenticated but `permission` is denied (defaults to PermissionGuard hide behaviour). */
  permissionFallback?: ReactNode;
  children: ReactNode;
}

function SessionGate({ permission, permissionFallback, children }: SessionGateProps): ReactNode {
  const auth = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (auth.status === 'loading') {
    return (
      <Page>
        <div style={{ padding: '2rem' }}>
          <Spinner label={t('loadingSession')} />
        </div>
      </Page>
    );
  }

  if (auth.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return permission ? (
    <PermissionGuard permission={permission} fallback={permissionFallback}>
      {children}
    </PermissionGuard>
  ) : (
    children
  );
}

/**
 * Gate order: feature flag → authenticated session → RBAC permission.
 */
export function ProtectedRoute({ flag, ...session }: SessionGateProps & { flag?: string }): ReactNode {
  const gated = <SessionGate {...session} />;
  return flag ? <FeatureGuard flag={flag}>{gated}</FeatureGuard> : gated;
}
