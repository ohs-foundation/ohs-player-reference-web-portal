import { describe, expect, it } from 'vitest';

describe('OIDC discovery (non-Keycloak smoke)', () => {
  it('fetches openid-configuration from a public demo issuer', async () => {
    const issuer = 'https://demo.duendesoftware.com';
    const res = await fetch(`${issuer}/.well-known/openid-configuration`);
    expect(res.ok).toBe(true);
    const doc = (await res.json()) as { token_endpoint: string; authorization_endpoint: string };
    expect(doc.token_endpoint).toContain('connect/token');
    expect(doc.authorization_endpoint).toContain('connect/authorize');
  });
});
