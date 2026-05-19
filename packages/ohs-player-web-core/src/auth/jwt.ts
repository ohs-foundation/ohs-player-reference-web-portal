/** Decodes JWT payload (no signature verification — intended for role extraction only). */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  const b64 = parts[1];
  if (!b64) return {};
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
