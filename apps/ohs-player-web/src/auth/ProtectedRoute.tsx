import {
  FeatureGuard,
  Page,
  PermissionGuard,
  Spinner,
  useAuth,
  useTranslation,
} from 'ohs-player-web-core';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Gate order: feature flag → authenticated session → RBAC permission.
 */
export function ProtectedRoute({
  flag,
  permission,
  permissionFallback,
  children,
}: {
  flag?: string;
  permission?: string;
  /** Rendered when authenticated but `permission` is denied (defaults to PermissionGuard hide behaviour). */
  permissionFallback?: ReactNode;
  children: ReactNode;
}): ReactNode {
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

  const inner = permission ? (
    <PermissionGuard permission={permission} fallback={permissionFallback}>
      {children}
    </PermissionGuard>
  ) : (
    children
  );

  if (flag) {
    return <FeatureGuard flag={flag}>{inner}</FeatureGuard>;
  }

  return inner;
}
