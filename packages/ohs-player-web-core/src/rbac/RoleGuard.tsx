import type { ReactNode } from 'react';
import { useCoreConfig } from '../providers/CoreConfigProvider';
import { useRoles } from '../providers/CoreConfigProvider';

export function RoleGuard({
  role,
  children,
  fallback,
}: {
  role: string;
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const roles = useRoles();
  const { rbac } = useCoreConfig();
  const behaviour = rbac?.unauthorizedBehaviour ?? 'hide';
  const redirectPath = rbac?.unauthorizedRedirectPath ?? '/unauthorized';
  const can = roles.includes(role);

  if (can) return children;

  if (fallback !== undefined) return fallback;

  switch (behaviour) {
    case 'disable':
      return (
        <span aria-disabled style={{ pointerEvents: 'none', opacity: 0.5 }} title="Insufficient role">
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
