import { DASHBOARD_REGIONS, type DashboardRegion } from '../../host/types';
import type { WidgetDefinition } from './widgetCatalogue';

export const MAX_KPIS = 4;

/** Card ids per region, in render order. Rows pair `main[i]` with `side[i]`. */
export interface DashboardLayout {
  kpi: readonly string[];
  main: readonly string[];
  side: readonly string[];
}

export type IdTest = (id: string) => boolean;

const always: IdTest = () => true;

/** Whether `entry` is a `<prefix>.*` pattern rather than an exact widget id. */
export function isWidgetPattern(entry: string): boolean {
  return entry.endsWith('.*');
}

function matches(entry: string, id: string): boolean {
  return isWidgetPattern(entry) ? id.startsWith(entry.slice(0, -1)) : entry === id;
}

/** The ids an `available` list lets a user add. Absent allows every id. */
export function allowedBy(available: readonly string[] | undefined): IdTest {
  return available ? (id) => available.some((entry) => matches(entry, id)) : always;
}

export const EMPTY_LAYOUT: DashboardLayout = { kpi: [], main: [], side: [] };

function mapRegions(map: (region: DashboardRegion) => readonly string[]): DashboardLayout {
  return { kpi: map('kpi'), main: map('main'), side: map('side') };
}

function capKpis(ids: readonly string[], isVisible: IdTest): string[] {
  let visible = 0;
  return ids.filter((id) => {
    if (!isVisible(id)) return true;
    visible += 1;
    return visible <= MAX_KPIS;
  });
}

/** Each starting entry in `catalogue` in its first region, by `order`, KPIs cut to `MAX_KPIS`. */
export function defaultLayout(catalogue: readonly WidgetDefinition[]): DashboardLayout {
  const layout = mapRegions((region) =>
    catalogue
      .filter((entry) => entry.startsOnDashboard && entry.regions[0] === region)
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.id),
  );
  return { ...layout, kpi: layout.kpi.slice(0, MAX_KPIS) };
}

function isLayoutShape(value: unknown): value is Record<DashboardRegion, unknown[]> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return DASHBOARD_REGIONS.every((region) => Array.isArray(record[region]));
}

export interface SanitizeOptions {
  allowed?: IdTest;
  isVisible?: IdTest;
}

/**
 * A stored or configured layout cut to ids the catalogue knows, in a region their entry allows,
 * passing `allowed`, each once across the layout. Hidden ids are kept and do not count toward the
 * KPI cap. Anything that is not an object of three arrays reads as `undefined`.
 */
export function sanitizeLayout(
  value: unknown,
  catalogue: readonly WidgetDefinition[],
  { allowed = always, isVisible = always }: SanitizeOptions = {},
): DashboardLayout | undefined {
  if (!isLayoutShape(value)) return undefined;
  const byId = new Map(catalogue.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  const layout = mapRegions((region) =>
    value[region].filter((id): id is string => {
      if (typeof id !== 'string' || seen.has(id)) return false;
      const fits = byId.get(id)?.regions.includes(region) === true && allowed(id);
      if (fits) seen.add(id);
      return fits;
    }),
  );
  return { ...layout, kpi: capKpis(layout.kpi, isVisible) };
}

export function isAtKpiCap(layout: DashboardLayout, isVisible: IdTest = always): boolean {
  return layout.kpi.filter(isVisible).length >= MAX_KPIS;
}

export function regionOf(layout: DashboardLayout, id: string): DashboardRegion | undefined {
  return DASHBOARD_REGIONS.find((region) => layout[region].includes(id));
}

/** Appends `id` to `region` unless it is already placed or the KPI strip is full. */
export function addWidget(
  layout: DashboardLayout,
  region: DashboardRegion,
  id: string,
  isVisible: IdTest = always,
): DashboardLayout {
  if (regionOf(layout, id)) return layout;
  if (region === 'kpi' && isAtKpiCap(layout, isVisible)) return layout;
  return { ...layout, [region]: [...layout[region], id] };
}

export function removeWidget(layout: DashboardLayout, id: string): DashboardLayout {
  return mapRegions((region) => layout[region].filter((current) => current !== id));
}

/** Swaps `id` with the nearest visible card `delta` steps away in its region, if there is one. */
export function moveWidget(
  layout: DashboardLayout,
  id: string,
  delta: -1 | 1,
  isVisible: IdTest = always,
): DashboardLayout {
  const region = regionOf(layout, id);
  if (!region) return layout;
  const ids = [...layout[region]];
  const from = ids.indexOf(id);
  let to = from + delta;
  while (to >= 0 && to < ids.length && !isVisible(ids[to])) to += delta;
  if (to < 0 || to >= ids.length) return layout;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return { ...layout, [region]: ids };
}

export function sameLayout(a: DashboardLayout, b: DashboardLayout): boolean {
  return DASHBOARD_REGIONS.every(
    (region) =>
      a[region].length === b[region].length && a[region].every((id, i) => id === b[region][i]),
  );
}

/** One dashboard row: a main card beside a side card, or one full width card on its own. */
export interface DashboardRow<Card> {
  main?: Card;
  side?: Card;
  full: boolean;
}

/**
 * Pairs `main[i]` with `side[i]` by position. A full width card takes a row of its own at its place
 * in its column, a main card first when both columns reach one, and the other column moves down.
 */
export function pairRows<Card extends { full?: boolean }>(
  main: readonly Card[],
  side: readonly Card[],
): DashboardRow<Card>[] {
  const rows: DashboardRow<Card>[] = [];
  let m = 0;
  let s = 0;
  while (m < main.length || s < side.length) {
    const mainCard = main.at(m);
    const sideCard = side.at(s);
    if (mainCard?.full) {
      rows.push({ main: mainCard, full: true });
      m += 1;
    } else if (sideCard?.full) {
      rows.push({ side: sideCard, full: true });
      s += 1;
    } else {
      rows.push({ main: mainCard, side: sideCard, full: false });
      m += mainCard ? 1 : 0;
      s += sideCard ? 1 : 0;
    }
  }
  return rows;
}
