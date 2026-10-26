import { useMemo } from 'react';
import { useCustomResource } from 'ohs-player-web-core';
import type { Option } from './userFormOptions';

export interface IamGroup {
  id: string;
  name: string;
  path?: string;
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
}

interface RolesResponse {
  realmRoles?: { name?: string; description?: string }[];
  clients?: { clientId?: string; roles?: { name?: string; description?: string }[] }[];
}

export interface GrantedRole {
  key: string;
  name: string;
  client?: string;
  description?: string;
}

function toGroups(data: unknown): IamGroup[] {
  const list = Array.isArray(data) ? data : ((data as { groups?: unknown } | undefined)?.groups ?? []);
  return (Array.isArray(list) ? list : []).filter(
    (g): g is IamGroup => typeof (g as IamGroup)?.id === 'string' && typeof (g as IamGroup)?.name === 'string',
  );
}

/** Every IAM group, as multi-select options, from the `groups` gateway alias. */
export function useGroups(enabled = true): {
  groups: IamGroup[];
  options: Option[];
  isLoading: boolean;
  error: unknown;
} {
  const query = useCustomResource('groups', undefined, { enabled });
  const groups = useMemo(() => toGroups(query.data), [query.data]);
  const options = useMemo(() => groups.map((g) => ({ value: g.id, label: g.name })), [groups]);
  return { groups, options, isLoading: enabled && query.isLoading, error: query.error };
}

/** The roles the given groups grant, with descriptions looked up from the `roles` gateway alias. */
export function useGrantedRoles(groups: readonly IamGroup[]): {
  roles: GrantedRole[];
  isLoading: boolean;
  error: unknown;
} {
  const query = useCustomResource('roles', undefined, { enabled: groups.length > 0 });
  const roles = useMemo(() => {
    const catalog = query.data as RolesResponse | undefined;
    const described = new Map<string, string>();
    for (const r of catalog?.realmRoles ?? []) {
      if (r.name && r.description) described.set(r.name, r.description);
    }
    for (const c of catalog?.clients ?? []) {
      for (const r of c.roles ?? []) {
        if (r.name && r.description) described.set(`${c.clientId ?? ''}:${r.name}`, r.description);
      }
    }
    const granted = new Map<string, GrantedRole>();
    for (const g of groups) {
      for (const name of g.realmRoles ?? []) {
        granted.set(name, { key: name, name, description: described.get(name) });
      }
      for (const [client, names] of Object.entries(g.clientRoles ?? {})) {
        for (const name of names) {
          const key = `${client}:${name}`;
          granted.set(key, { key, name, client, description: described.get(key) });
        }
      }
    }
    return [...granted.values()];
  }, [groups, query.data]);
  return { roles, isLoading: groups.length > 0 && query.isLoading, error: query.error };
}
