import { readFileSync } from 'node:fs';
import { themeCss, type PortalConfigDocument, type SysColorRole } from 'ohs-player-web-core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { env } from './env';
import {
  FLAG_NAMES,
  portalConfigJsonSchema,
  SYS_COLOR_ROLES,
  validatePortalConfig,
  type PortalConfig,
} from './portalConfigSchema';

function rejection(input: unknown): string {
  const result = validatePortalConfig(input);
  if (result.success) throw new Error('expected the document to be rejected');
  return result.error;
}

describe('portal config schema', () => {
  it('accepts an empty document, since every field is optional', () => {
    expect(validatePortalConfig({})).toEqual({ success: true, data: {} });
  });

  it('names the field and the expected type when a value is wrong', () => {
    expect(rejection({ flags: { userMgmt: 'yes' } })).toMatch(
      /expected boolean[\s\S]*flags\.userMgmt/,
    );
  });

  it('rejects an unknown field', () => {
    expect(rejection({ colour: 'red' })).toContain('Unrecognized key: "colour"');
  });

  it('rejects a navigation entry missing a required field', () => {
    expect(
      rejection({ navigation: [{ id: 'users', to: '/users', labelKey: 'navUsers' }] }),
    ).toContain('navigation[0].order');
  });

  it('rejects a flag or brand pin the app does not have', () => {
    expect(rejection({ flags: { beta: true } })).toContain('flags.beta');
    expect(rejection({ brand: { overrides: { accent: '#000000' } } })).toContain(
      'brand.overrides.accent',
    );
  });

  it('only accepts documents the library type describes', () => {
    expectTypeOf<PortalConfig>().toMatchTypeOf<PortalConfigDocument>();
  });

  it('lists exactly the sys colour roles the theme emits', () => {
    expectTypeOf<(typeof SYS_COLOR_ROLES)[number]>().toEqualTypeOf<SysColorRole>();
    const emitted = new Set(
      [...themeCss().matchAll(/--ohs-sys-color-([a-z-]+):/g)].map((m) => m[1]),
    );
    expect([...emitted].sort()).toEqual([...SYS_COLOR_ROLES].sort());
  });

  it('lists exactly the flags env.ts reads', () => {
    expect(Object.keys(env.flags).sort()).toEqual([...FLAG_NAMES].sort());
  });

  it('keeps the checked-in JSON Schema in step with the zod schema', () => {
    const checkedIn: unknown = JSON.parse(readFileSync('public/portal-config.schema.json', 'utf8'));
    expect(checkedIn).toEqual(portalConfigJsonSchema());
  });
});
