import { describe, expectTypeOf, it } from 'vitest';
import type { DashboardRegion, PortalExtension } from './types';

type PortalWidget = NonNullable<PortalExtension['widgets']>[number];

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
});
