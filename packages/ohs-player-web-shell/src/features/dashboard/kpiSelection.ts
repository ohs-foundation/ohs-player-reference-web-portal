import { KPI_CATALOGUE, type KpiId } from './kpiCatalogue';

export const MAX_KPIS = 4;

const KNOWN_IDS: ReadonlySet<string> = new Set(KPI_CATALOGUE.map((kpi) => kpi.id));

export const DEFAULT_KPIS: readonly KpiId[] = KPI_CATALOGUE.slice(0, MAX_KPIS).map((kpi) => kpi.id);

function isKpiId(value: unknown): value is KpiId {
  return typeof value === 'string' && KNOWN_IDS.has(value);
}

/** Stored selection → the first `MAX_KPIS` distinct known ids; anything that is not an array reads as the default. */
export function sanitizeKpis(value: unknown): KpiId[] {
  if (!Array.isArray(value)) return [...DEFAULT_KPIS];
  return [...new Set(value.filter(isKpiId))].slice(0, MAX_KPIS);
}

/** Ticks or unticks `id`; ticking past `max` returns the selection unchanged. */
export function toggleKpi(
  selected: readonly KpiId[],
  id: KpiId,
  max: number = MAX_KPIS,
): readonly KpiId[] {
  if (selected.includes(id)) return selected.filter((current) => current !== id);
  return selected.length >= max ? selected : [...selected, id];
}
