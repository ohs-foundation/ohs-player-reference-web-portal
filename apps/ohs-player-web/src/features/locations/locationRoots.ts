import type { Location } from '@medplum/fhirtypes';
import { FhirError, type FhirClient } from 'ohs-player-web-core';

export interface LocationRootOption {
  value: string;
  label: string;
}

/** True when the Location has no parent reference (a hierarchy root). */
export function isRootLocation(loc: Pick<Location, 'partOf'>): boolean {
  return !loc.partOf?.reference;
}

/**
 * Keep Locations without `partOf`, map to select options, sort by label.
 * Used after a full (or :missing-filtered) search page walk.
 */
export function locationRootsFromResources(
  resources: readonly unknown[],
  unnamed: (id: string) => string,
): LocationRootOption[] {
  const roots: LocationRootOption[] = [];
  for (const raw of resources) {
    const loc = raw as Location;
    if (!loc?.id || !isRootLocation(loc)) continue;
    const name = loc.name?.trim();
    roots.push({
      value: loc.id,
      label: name ? name : unnamed(loc.id),
    });
  }
  roots.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return roots;
}

const ROOT_ELEMENTS = 'id,name,partOf,status';
const PAGE_SIZE = 500;

/**
 * Load every hierarchy root across the whole Location store.
 *
 * Prefers `partof:missing=true` when the server supports it (few pages for many children).
 * HAPI historically rejects that modifier — on 400/422 we fall back to paging the full set and
 * filtering client-side so large imports cannot push older roots out of a single `_count` window.
 */
export async function fetchLocationRoots(
  client: FhirClient,
  unnamed: (id: string) => string,
): Promise<LocationRootOption[]> {
  const lean = { _elements: ROOT_ELEMENTS };
  try {
    const resources = await client.searchAll(
      'Location',
      { ...lean, 'partof:missing': 'true' },
      { pageSize: PAGE_SIZE, maxPages: 50 },
    );
    return locationRootsFromResources(resources, unnamed);
  } catch (err) {
    if (!(err instanceof FhirError) || (err.status !== 400 && err.status !== 422)) throw err;
  }

  const resources = await client.searchAll('Location', lean, { pageSize: PAGE_SIZE, maxPages: 100 });
  return locationRootsFromResources(resources, unnamed);
}

/** Lean full-store Location list for parent pickers / cycle checks (paginated). */
export async function fetchAllLocationsLean(client: FhirClient): Promise<Location[]> {
  const resources = await client.searchAll(
    'Location',
    { _elements: 'id,name,partOf' },
    { pageSize: PAGE_SIZE, maxPages: 100 },
  );
  return resources.filter((r): r is Location => {
    const loc = r as Location;
    return Boolean(loc?.id);
  });
}
