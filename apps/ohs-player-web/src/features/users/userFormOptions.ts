/** Option types + helpers shared by the user form controls (kept out of the component module). */

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
