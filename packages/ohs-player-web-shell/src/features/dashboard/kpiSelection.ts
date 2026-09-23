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

/**
 * Ticks or unticks `id`. Ticking is rejected once `max` ids that pass `counts` are ticked, so ids
 * the user cannot see can be kept without using up the limit.
 */
export function toggleKpi(
  selected: readonly KpiId[],
  id: KpiId,
  max: number = MAX_KPIS,
  counts: (id: KpiId) => boolean = () => true,
): readonly KpiId[] {
  if (selected.includes(id)) return selected.filter((current) => current !== id);
  return selected.filter(counts).length >= max ? selected : [...selected, id];
}

/** Visible ids first, so trimming to the limit drops a hidden id before anything the user chose. */
export function visibleFirst(ids: readonly KpiId[], isVisible: (id: KpiId) => boolean): KpiId[] {
  return [...ids.filter(isVisible), ...ids.filter((id) => !isVisible(id))];
}
