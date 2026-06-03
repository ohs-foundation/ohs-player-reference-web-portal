import type { ReactNode } from 'react';
import { useCoreConfig, usePermission } from '../providers/CoreConfigProvider';

export type GuardFallback = ReactNode;

export function PermissionGuard({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: ReactNode;
  fallback?: GuardFallback;
}): ReactNode {
  const { can } = usePermission(permission);
  const { rbac } = useCoreConfig();
  const behaviour = rbac?.unauthorizedBehaviour ?? 'hide';
  const redirectPath = rbac?.unauthorizedRedirectPath ?? '/unauthorized';

  if (can) return children;

  if (fallback !== undefined) return fallback;

  switch (behaviour) {
    case 'disable':
      return (
        <span aria-disabled style={{ pointerEvents: 'none', opacity: 0.5 }} title="Insufficient permission">
          {children}
        </span>
      );
    case 'redirect':
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.location.assign(redirectPath);
      }
      return null;
    default:
      return null;
  }
}
