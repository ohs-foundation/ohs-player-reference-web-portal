import { createContext, useContext } from 'react';
import type { District, ScopeIds } from './scope';

export type ScopeStatus = 'loading' | 'unscoped' | 'scoped';

export interface AdminScope extends ScopeIds {
  status: ScopeStatus;
  districts: readonly District[];
  current: District | null;
  setCurrent: (districtId: string) => void;
  incomplete: boolean;
  loadFailed: boolean;
}

export const UNSCOPED: AdminScope = {
  status: 'unscoped',
  districts: [],
  current: null,
  setCurrent: () => undefined,
  locationIds: new Set(),
  practitionerIds: new Set(),
  roleIds: new Set(),
  organizationIds: new Set(),
  incomplete: false,
  loadFailed: false,
};

export const AdminScopeContext = createContext<AdminScope>(UNSCOPED);

export function useAdminScope(): AdminScope {
  return useContext(AdminScopeContext);
}

export function rowsInScope<T>(
  rows: readonly T[],
  scope: AdminScope,
  inScope: (row: T) => boolean,
): readonly T[] {
  if (scope.status === 'unscoped') return rows;
  if (scope.status === 'loading') return [];
  return rows.filter(inScope);
}
