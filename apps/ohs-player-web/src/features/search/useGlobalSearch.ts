import { useEffect, useMemo, useState } from 'react';
import { useSearch } from 'ohs-player-web-core';

export interface SearchHit {
  id: string;
  label: string;
}

export interface SearchGroup {
  /** Resource type key, e.g. 'Practitioner'. */
  type: string;
  /** i18n key for the group heading. */
  titleKey: string;
  /** List route the group links to (with `?q=` appended by the consumer). */
  to: string;
  hits: SearchHit[];
}

type SearchBundle = { entry?: { resource?: Record<string, unknown> }[] };

const DEBOUNCE_MS = 300;
const PER_TYPE = 5;

/** Debounce a fast-changing value so each keystroke doesn't fire a query. */
function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function rowsOf(data: unknown): Record<string, unknown>[] {
  return ((data as SearchBundle | undefined)?.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is Record<string, unknown> => Boolean(r));
}

function nameOf(resource: Record<string, unknown>): string {
  const name = resource.name;
  if (typeof name === 'string') return name; // Location / Organization / CareTeam
  const human = (name as { given?: string[]; family?: string }[] | undefined)?.[0]; // Practitioner
  if (human) return `${human.given?.join(' ') ?? ''} ${human.family ?? ''}`.trim();
  return '';
}

/**
 * Cross-resource quick search. Each FHIR type exposes a `name` search param, so one debounced query per
 * type runs in parallel (disabled until ≥2 chars). Returns grouped hits for the dropdown; the term is
 * carried to the destination list page via `?q=`.
 */
export function useGlobalSearch(rawTerm: string): { groups: SearchGroup[]; loading: boolean; hasTerm: boolean } {
  const term = useDebounced(rawTerm.trim(), DEBOUNCE_MS);
  const hasTerm = term.length >= 2;
  const params = hasTerm ? { name: term, _count: String(PER_TYPE) } : undefined;

  const practitioners = useSearch(hasTerm ? 'Practitioner' : undefined, params);
  const locations = useSearch(hasTerm ? 'Location' : undefined, params);
  const organizations = useSearch(hasTerm ? 'Organization' : undefined, params);
  const careTeams = useSearch(hasTerm ? 'CareTeam' : undefined, params);

  const groups = useMemo<SearchGroup[]>(() => {
    const toHits = (data: unknown): SearchHit[] =>
      rowsOf(data)
        .map((r) => ({ id: typeof r.id === 'string' ? r.id : '', label: nameOf(r) || (r.id as string) }))
        .filter((h) => h.id);
    return [
      { type: 'Practitioner', titleKey: 'navUsers', to: '/users', hits: toHits(practitioners.data) },
      { type: 'Location', titleKey: 'navLocations', to: '/locations', hits: toHits(locations.data) },
      { type: 'Organization', titleKey: 'navOrganizations', to: '/organizations', hits: toHits(organizations.data) },
      { type: 'CareTeam', titleKey: 'navCareTeams', to: '/care-teams', hits: toHits(careTeams.data) },
    ].filter((g) => g.hits.length > 0);
  }, [practitioners.data, locations.data, organizations.data, careTeams.data]);

  return {
    groups,
    loading:
      hasTerm &&
      (practitioners.isLoading || locations.isLoading || organizations.isLoading || careTeams.isLoading),
    hasTerm,
  };
}
