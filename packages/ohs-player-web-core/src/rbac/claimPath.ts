export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    return value.split(/[,\s]+/).filter(Boolean);
  }
  return [];
}

/**
 * Resolves realm roles from an ID token / access token JWT payload.
 * When `claimPath` is the default `roles`, falls back to Keycloak's standard
 * `realm_access.roles` if the custom mapper claim is absent.
 */
export function rolesFromJwtPayload(payload: unknown, claimPath: string): string[] {
  const primary = normalizeRoles(getByPath(payload, claimPath));
  if (primary.length > 0) return primary;

  if (claimPath === 'roles') {
    const realm = normalizeRoles(getByPath(payload, 'realm_access.roles'));
    if (realm.length > 0) return realm;
  }

  return [];
}
