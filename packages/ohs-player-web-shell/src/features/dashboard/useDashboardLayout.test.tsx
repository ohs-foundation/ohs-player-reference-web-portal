import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NAVIGATION } from '../../config/navigation';
import { defaultLayout, type DashboardLayout } from './dashboardLayout';
import { builtinWidgets } from './widgetCatalogue';

let sub = 'u1';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return { ...actual, useAuth: () => ({ status: 'authenticated', user: { sub } }) };
});

const { LAYOUT_STORAGE_PREFIX, LEGACY_KPI_STORAGE_PREFIX, useDashboardLayout } =
  await import('./useDashboardLayout');

const catalogue = builtinWidgets(DEFAULT_NAVIGATION);
const defaults = defaultLayout(catalogue);
const options = { catalogue, defaults };

const usersOnly: DashboardLayout = { kpi: ['kpi.users'], main: ['recent.users'], side: [] };

function stored(user = 'u1'): unknown {
  const raw = window.localStorage.getItem(`${LAYOUT_STORAGE_PREFIX}${user}`);
  return raw === null ? null : JSON.parse(raw);
}

describe('useDashboardLayout', () => {
  beforeEach(() => {
    sub = 'u1';
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts from the defaults when nothing is stored', () => {
    expect(renderHook(() => useDashboardLayout(options)).result.current.layout).toEqual(defaults);
  });

  it('persists a saved layout per user and reads it back after a reload', () => {
    const first = renderHook(() => useDashboardLayout(options));
    act(() => first.result.current.save({ layout: usersOnly, settings: {} }));

    expect(first.result.current.layout).toEqual(usersOnly);
    expect(stored()).toEqual({ version: 1, layout: usersOnly });

    first.unmount();
    expect(renderHook(() => useDashboardLayout(options)).result.current.layout).toEqual(usersOnly);

    sub = 'u2';
    expect(renderHook(() => useDashboardLayout(options)).result.current.layout).toEqual(defaults);
  });

  it('forgets the stored layout when a save equals the defaults', () => {
    const { result } = renderHook(() => useDashboardLayout(options));
    act(() => result.current.save({ layout: usersOnly, settings: {} }));
    act(() => result.current.save({ layout: defaults, settings: {} }));

    expect(stored()).toBeNull();
    expect(result.current.layout).toEqual(defaults);
  });

  it('drops a stored id the catalogue no longer has, without an error', () => {
    window.localStorage.setItem(
      `${LAYOUT_STORAGE_PREFIX}u1`,
      JSON.stringify({ version: 1, layout: { ...usersOnly, side: ['reports.gone'] } }),
    );

    expect(renderHook(() => useDashboardLayout(options)).result.current.layout).toEqual(usersOnly);
  });

  it.each(['{not json', '{"version":2,"layout":{"kpi":[],"main":[],"side":[]}}', '[]'])(
    'falls back to the defaults when storage holds %s',
    (raw) => {
      window.localStorage.setItem(`${LAYOUT_STORAGE_PREFIX}u1`, raw);

      expect(renderHook(() => useDashboardLayout(options)).result.current.layout).toEqual(defaults);
    },
  );

  it('trims stored ids the deployment no longer allows, but keeps its own starting cards', () => {
    window.localStorage.setItem(
      `${LAYOUT_STORAGE_PREFIX}u1`,
      JSON.stringify({ version: 1, layout: { ...usersOnly, side: ['chart.usersByStatus'] } }),
    );
    const allowed = (id: string) => !id.startsWith('chart.');
    const deployment = { ...usersOnly, kpi: ['kpi.users'] };

    expect(
      renderHook(() => useDashboardLayout({ catalogue, defaults: deployment, allowed })).result
        .current.layout,
    ).toEqual(usersOnly);
    expect(
      renderHook(() =>
        useDashboardLayout({
          catalogue,
          defaults: { ...deployment, side: ['chart.usersByStatus'] },
          allowed,
        }),
      ).result.current.layout.side,
    ).toEqual(['chart.usersByStatus']);
  });

  it('moves the old KPI selection into the layout once and removes the old key', () => {
    window.localStorage.setItem(`${LEGACY_KPI_STORAGE_PREFIX}u1`, '["careTeams","users"]');

    const { result } = renderHook(() => useDashboardLayout(options));

    const migrated = { ...defaults, kpi: ['kpi.careTeams', 'kpi.users'] };
    expect(result.current.layout).toEqual(migrated);
    expect(stored()).toEqual({ version: 1, layout: migrated });
    expect(window.localStorage.getItem(`${LEGACY_KPI_STORAGE_PREFIX}u1`)).toBeNull();
  });

  it('removes an old selection equal to the default without storing a layout', () => {
    window.localStorage.setItem(
      `${LEGACY_KPI_STORAGE_PREFIX}u1`,
      '["users","locations","organizations","careTeams"]',
    );

    expect(renderHook(() => useDashboardLayout(options)).result.current.layout).toEqual(defaults);
    expect(stored()).toBeNull();
    expect(window.localStorage.getItem(`${LEGACY_KPI_STORAGE_PREFIX}u1`)).toBeNull();
  });

  it('applies a save for the session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useDashboardLayout(options));

    act(() => result.current.save({ layout: usersOnly, settings: {} }));

    expect(result.current.layout).toEqual(usersOnly);
  });

  it('keeps card settings beside the layout and drops ones the catalogue does not know', () => {
    const first = renderHook(() => useDashboardLayout(options));
    const settings = { 'recent.users': { rows: '10', width: 'full' } };
    act(() => first.result.current.save({ layout: defaults, settings }));

    expect(stored()).toEqual({ version: 1, layout: defaults, settings });
    first.unmount();

    window.localStorage.setItem(
      `${LAYOUT_STORAGE_PREFIX}u1`,
      JSON.stringify({
        version: 1,
        layout: defaults,
        settings: { ...settings, 'kpi.users': { width: 'full' }, 'gone.card': { rows: '10' } },
      }),
    );
    expect(renderHook(() => useDashboardLayout(options)).result.current.settings).toEqual(settings);
  });

  it('ignores stored settings when customization is off', () => {
    window.localStorage.setItem(
      `${LAYOUT_STORAGE_PREFIX}u1`,
      JSON.stringify({
        version: 1,
        layout: defaults,
        settings: { 'recent.users': { rows: '10' } },
      }),
    );

    const { result } = renderHook(() => useDashboardLayout({ ...options, customizable: false }));
    expect(result.current.settings).toEqual({});
  });
});
