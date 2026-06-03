import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CorePlatformConfig, RbacConfig, UsePermissionResult } from '../types/config';
import { useAuthContext } from '../auth/AuthProvider';
import { decodeJwtPayload } from '../auth/jwt';
import { rolesFromJwtPayload } from '../rbac/claimPath';

const CoreConfigContext = createContext<CorePlatformConfig | null>(null);

export function CoreConfigProvider({
  config,
  children,
}: {
  config: CorePlatformConfig;
  children: ReactNode;
}): React.ReactElement {
  return <CoreConfigContext.Provider value={config}>{children}</CoreConfigContext.Provider>;
}

export function useCoreConfig(): CorePlatformConfig {
  const c = useContext(CoreConfigContext);
  if (!c) throw new Error('CorePlatformProvider is required');
  return c;
}

function useResolvedRoles(config: RbacConfig | undefined): readonly string[] {
  const { auth } = useAuthContext();
  const [roles, setRoles] = useState<readonly string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (!config) {
        if (!cancelled) setRoles([]);
        return;
      }

      if (config.adapter) {
        try {
          const r = await config.adapter.getRoles();
          if (!cancelled) setRoles([...r]);
        } catch {
          if (!cancelled) setRoles([]);
        }
        return;
      }

      if (auth.status !== 'authenticated') {
        if (!cancelled) setRoles([]);
        return;
      }

      const token = await auth.getAccessToken();
      if (!token) {
        if (!cancelled) setRoles([]);
        return;
      }
      const payload = decodeJwtPayload(token);
      const path = config.claimPath ?? 'roles';
      if (!cancelled) setRoles(rolesFromJwtPayload(payload, path));
    };

    void run();
    return (): void => {
      cancelled = true;
    };
  }, [auth, auth.status, config]);

  return roles;
}

export function useRoles(): readonly string[] {
  const { rbac } = useCoreConfig();
  return useResolvedRoles(rbac);
}

export function usePermission(permission: string): UsePermissionResult {
  const { rbac } = useCoreConfig();
  const roles = useResolvedRoles(rbac);
  const { auth } = useAuthContext();
  const [adapterCan, setAdapterCan] = useState<boolean | null>(null);

  useEffect(() => {
    if (!rbac?.adapter) {
      setAdapterCan(null);
      return;
    }
    let cancelled = false;
    void rbac.adapter.hasPermission(permission).then((ok) => {
      if (!cancelled) setAdapterCan(ok);
    });
    return (): void => {
      cancelled = true;
    };
  }, [permission, rbac]);

  return useMemo((): UsePermissionResult => {
    if (!rbac) {
      return { can: false, roles };
    }

    if (rbac.adapter) {
      return { can: adapterCan ?? false, roles };
    }

    const allowedRoles = rbac.permissionMap[permission];
    if (!allowedRoles?.length) {
      return { can: false, roles };
    }

    if (auth.status !== 'authenticated') {
      return { can: false, roles };
    }

    const can = allowedRoles.some((r) => roles.includes(r));
    return { can, roles };
  }, [adapterCan, auth.status, permission, rbac, roles]);
}
