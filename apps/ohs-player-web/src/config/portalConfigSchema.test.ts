import { readFileSync } from 'node:fs';
import { themeCss, type PortalConfigDocument, type SysColorRole } from 'ohs-player-web-core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { env } from './env';
import {
  FLAG_NAMES,
  portalConfigIssues,
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

  it('lists each issue with the path and message the loader reports', () => {
    const document = {
      colour: 'red',
      flags: { userMgmt: 'yes' },
      navigation: [{ id: 'users', to: '/users', labelKey: 'navUsers', order: 'ten' }],
    };
    const issues = portalConfigIssues(document);
    const loaderText = rejection(document);

    expect(issues.map((issue) => issue.path).sort()).toEqual(
      ['', 'flags.userMgmt', 'navigation[0].order'].sort(),
    );
    for (const { path, message } of issues) {
      expect(loaderText).toContain(message);
      if (path) expect(loaderText).toContain(`at ${path}`);
    }
  });

  it('lists no issues for a valid document', () => {
    expect(portalConfigIssues({ flags: { userMgmt: false } })).toEqual([]);
  });

  it.each([
    '#094F9A',
    '#fff',
    '#094F9A80',
    'rgb(9 79 154 / 50%)',
    'transparent',
    'var(--ohs-ref-palette-primary40)',
  ])('accepts the brand pin %s', (pin) => {
    expect(validatePortalConfig({ brand: { overrides: { primary: pin } } }).success).toBe(true);
  });

  it.each([
    '#fff; } body { display: none } :root {',
    'url(https://tracker.example/p.png)',
    'rgb(/*)',
    'var(--ohs-ref-palette-primary40, */)',
    'var(--missing, image-set("https://tracker.example/p.png" 1x))',
    'rgb(0 0 0)\n}',
    '#12345',
  ])('rejects the brand pin %s as not a colour', (pin) => {
    expect(rejection({ brand: { darkOverrides: { primary: pin } } })).toMatch(
      /must be a CSS colour[\s\S]*brand\.darkOverrides\.primary/,
    );
  });

  it.each(['/', '/users', '/care-teams', '/resources/Patient'])(
    'accepts the sidebar path %s',
    (to) => {
      const entry = { id: 'users', to, labelKey: 'navUsers', order: 10 };
      expect(validatePortalConfig({ navigation: [entry] }).success).toBe(true);
    },
  );

  it.each([
    '//attacker.example/users',
    '/\\attacker.example/users',
    '/\t/attacker.example',
    'users',
  ])('rejects the sidebar path %j as leaving the portal', (to) => {
    const entry = { id: 'users', to, labelKey: 'navUsers', order: 10 };
    expect(rejection({ navigation: [entry] })).toMatch(
      /must be a path inside the portal[\s\S]*navigation\[0\]\.to/,
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

  it('lets a document switch off, place and restrict the audit log', () => {
    const document = {
      flags: { auditLog: false },
      navigation: [
        {
          id: 'audit',
          to: '/audit',
          labelKey: 'navAudit',
          order: 5,
          requires: { flag: 'auditLog', permission: 'audit.view' },
        },
      ],
      permissionMap: { 'audit.view': ['admin', 'auditor'] },
    };
    expect(validatePortalConfig(document)).toEqual({ success: true, data: document });
  });

  it('names the flag when a nav entry requires one the app does not have', () => {
    expect(
      rejection({
        navigation: [
          {
            id: 'audit',
            to: '/audit',
            labelKey: 'navAudit',
            order: 80,
            requires: { flag: 'audit' },
          },
        ],
      }),
    ).toContain('navigation[0].requires.flag');
  });

  it('accepts a dashboard layout, available ids and patterns, and the customization switch', () => {
    const dashboard = {
      layout: { kpi: ['kpi.users', 'schedules.active'], main: [], side: ['chart.usersByStatus'] },
      available: ['kpi.*', 'recent.users', 'chart.updatedByMonth.*'],
      userCustomization: false,
    };

    expect(validatePortalConfig({ dashboard })).toEqual({ success: true, data: { dashboard } });
  });

  it('names the path when a dashboard widget id is malformed', () => {
    const error = rejection({ dashboard: { layout: { main: ['recent.users', 'visits'] } } });

    expect(error).toContain('must be a widget id such as kpi.users or schedules.active');
    expect(error).toContain('dashboard.layout.main[1]');
  });

  it.each(['*', '.*', 'kpi.*.users', 'kpi'])('rejects the available entry %s', (entry) => {
    const error = rejection({ dashboard: { available: [entry] } });

    expect(error).toContain('must be a widget id such as kpi.users, or a pattern such as chart.*');
    expect(error).toContain('dashboard.available[0]');
  });

  it('rejects an unknown dashboard field', () => {
    expect(rejection({ dashboard: { layout: { top: [] } } })).toContain('dashboard.layout');
  });

  it('offers the built in widget ids to editors through the JSON Schema', () => {
    expect(JSON.stringify(portalConfigJsonSchema())).toContain('"examples":["kpi.users"');
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
