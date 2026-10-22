import type { ReactNode } from 'react';
import { AdminScopeContext } from './useAdminScope';
import { useResolvedScope } from './useResolvedScope';

export function ScopeProvider({ children }: Readonly<{ children: ReactNode }>): React.ReactElement {
  const scope = useResolvedScope();
  return <AdminScopeContext.Provider value={scope}>{children}</AdminScopeContext.Provider>;
}
