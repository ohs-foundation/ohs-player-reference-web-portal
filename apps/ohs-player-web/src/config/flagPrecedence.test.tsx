import { renderHook } from '@testing-library/react';
import { FlagsProvider, useFlag } from 'ohs-player-web-core';
import { createPortalHost } from 'ohs-player-web-shell';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validatePortalConfig } from './portalConfigSchema';

const FLAG = 'fhirViewer';
const ENV_VAR = 'VITE_FLAG_FHIR_VIEWER';

async function resolvedFlag(flag: string, document: unknown = {}): Promise<boolean> {
  vi.resetModules();
  const { portalDefaults } = await import('./platform');
  const parsed = validatePortalConfig(document);
  if (!parsed.success) throw new Error(parsed.error);
  const { portal } = createPortalHost({
    defaults: portalDefaults,
    document: parsed.data,
    development: true,
  });
  const { result } = renderHook(() => useFlag(flag), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <FlagsProvider config={portal.platform.flags}>{children}</FlagsProvider>
    ),
  });
  return result.current;
}

describe('feature flag precedence', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    { environment: 'true', document: false },
    { environment: 'false', document: true },
  ])(
    'takes the document value $document over the environment value $environment',
    async ({ environment, document }) => {
      vi.stubEnv(ENV_VAR, environment);

      expect(await resolvedFlag(FLAG, { flags: { [FLAG]: document } })).toBe(document);
    },
  );

  it.each([
    { environment: 'true', expected: true },
    { environment: 'false', expected: false },
  ])(
    'takes the environment value $environment when the document leaves the flag out',
    async ({ environment, expected }) => {
      vi.stubEnv(ENV_VAR, environment);

      expect(await resolvedFlag(FLAG, { flags: {} })).toBe(expected);
    },
  );

  it('reads an unset environment variable as on', async () => {
    vi.stubEnv(ENV_VAR, undefined);

    expect(await resolvedFlag(FLAG)).toBe(true);
  });

  it('falls back to the defaultValue of false for a flag neither layer sets', async () => {
    expect(await resolvedFlag('flagNothingDeclares')).toBe(false);
  });
});
