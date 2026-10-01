/** Option types + helpers shared by the user form controls (kept out of the component module). */
import type { Bundle, Location } from '@medplum/fhirtypes';

export interface Option {
  value: string;
  label: string;
}

interface SearchBundle {
  entry?: { resource?: { id?: string; name?: string } }[];
}

/** FHIR search bundle → `{ value: "Type/id", label: name }[]` options. */
export function referenceOptions(bundle: unknown, resourceType: string): Option[] {
  return ((bundle as SearchBundle | undefined)?.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is { id?: string; name?: string } => Boolean(r?.id))
    .map((r) => ({ value: `${resourceType}/${r.id ?? ''}`, label: r.name ?? r.id ?? '' }));
}

export const LOCATION_STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'locationStatusActive',
  suspended: 'locationStatusSuspended',
  inactive: 'locationStatusInactive',
};

export function locationsFromBundle(bundle: unknown): Location[] {
  return ((bundle as Bundle<Location> | undefined)?.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is Location => r?.resourceType === 'Location');
}

/** Locations → deduplicated `{ value: "Location/id", label }[]`; a non-active status is appended to the label. */
export function locationOptions(
  locations: readonly Location[],
  t: (key: string) => string,
): Option[] {
  const seen = new Set<string>();
  const options: Option[] = [];
  for (const location of locations) {
    const { id, status } = location;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = location.name?.trim() ? location.name : id;
    const statusKey =
      status && status !== 'active' ? LOCATION_STATUS_LABEL_KEYS[status] : undefined;
    options.push({
      value: `Location/${id}`,
      label: statusKey ? `${name} (${t(statusKey)})` : name,
    });
  }
  return options;
}
