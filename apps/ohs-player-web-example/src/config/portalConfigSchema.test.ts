import type { PortalConfigDocument } from 'ohs-player-web-core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { validatePortalConfig, type PortalConfig } from './portalConfigSchema';

function rejection(input: unknown): string {
  const result = validatePortalConfig(input);
  if (result.success) throw new Error('expected the document to be rejected');
  return result.error;
}

describe('example portal config schema', () => {
  it('only accepts documents the library type describes', () => {
    expectTypeOf<PortalConfig>().toMatchTypeOf<PortalConfigDocument>();
  });

  it('accepts a dashboard layout with extension ids and prefix patterns', () => {
    const dashboard = {
      layout: { kpi: ['schedules.active', 'kpi.users'], main: ['recent.users'] },
      available: ['kpi.*', 'schedules.*'],
      userCustomization: true,
    };

    expect(validatePortalConfig({ dashboard })).toEqual({ success: true, data: { dashboard } });
  });

  it('rejects a brand pin that is not a colour', () => {
    const error = rejection({
      brand: { overrides: { primary: 'url(https://tracker.example/p.png)' } },
    });

    expect(error).toContain(
      'must be a CSS colour such as #094F9A, rgb(9 79 154) or a named colour',
    );
    expect(error).toContain('brand.overrides.primary');
  });

  it('rejects a word that is not a colour name, and a pin that refers to itself', () => {
    expect(rejection({ brand: { overrides: { primary: 'banana' } } })).toContain(
      'must be a CSS colour',
    );
    expect(
      rejection({ brand: { overrides: { primary: 'var(--ohs-sys-color-primary)' } } }),
    ).toContain('must not refer back to itself');
  });

  it('rejects a brand pin that opens a CSS comment', () => {
    expect(rejection({ brand: { overrides: { primary: 'rgb(/*)' } } })).toContain(
      'brand.overrides.primary',
    );
  });

  it('rejects a sidebar path that leaves the portal', () => {
    const entry = { id: 'users', to: '//attacker.example/users', labelKey: 'navUsers', order: 10 };
    const error = rejection({ navigation: [entry] });

    expect(error).toContain('must be a path inside the portal, such as /users');
    expect(error).toContain('navigation[0].to');
  });

  it('names the path when a dashboard widget id is malformed', () => {
    const error = rejection({ dashboard: { layout: { kpi: ['schedules'] } } });

    expect(error).toContain('must be a widget id such as kpi.users or schedules.active');
    expect(error).toContain('dashboard.layout.kpi[0]');
  });

  it('names the path when an available entry is neither an id nor a pattern', () => {
    const error = rejection({ dashboard: { available: ['schedules.*.x'] } });

    expect(error).toContain('must be a widget id such as kpi.users, or a pattern such as chart.*');
    expect(error).toContain('dashboard.available[0]');
  });
});
