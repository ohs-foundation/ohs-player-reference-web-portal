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
