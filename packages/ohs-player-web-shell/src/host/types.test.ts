import { describe, expect, expectTypeOf, it } from 'vitest';
import { SLOT_NAMES, type DashboardRegion, type PortalExtension, type SlotContexts } from './types';

type PortalWidget = NonNullable<PortalExtension['widgets']>[number];

type PortalSlot = NonNullable<PortalExtension['slots']>[number];

describe('PortalExtension', () => {
  it('names exactly the dashboard regions the shell declares', () => {
    expectTypeOf<DashboardRegion>().toEqualTypeOf<'kpi' | 'main' | 'side'>();
  });

  it('accepts a widget in a declared region', () => {
    expectTypeOf<{
      id: string;
      region: 'side';
      order: number;
      load: PortalWidget['load'];
    }>().toMatchTypeOf<PortalWidget>();
  });

  it('rejects a widget in a region the shell does not declare', () => {
    expectTypeOf<{
      id: string;
      region: 'sidebar';
      order: number;
      load: PortalWidget['load'];
    }>().not.toMatchTypeOf<PortalWidget>();
  });

  it('declares the app bar slot with an empty context', () => {
    expect(SLOT_NAMES).toContain('topbar.actions');
    expectTypeOf<SlotContexts['topbar.actions']>().toEqualTypeOf<Record<string, never>>();
    expectTypeOf<{
      id: string;
      slot: 'topbar.actions';
      order: number;
      component: () => null;
    }>().toMatchTypeOf<PortalSlot>();
  });
});
