import { LOCATION_LINK_IDS, locationBodyFromAnswers } from '../sdc/resourceFromAnswers';
import { draftLocationEntry } from '../setup-wizard/commitSetupWizard';
import type { DraftLocation } from '../setup-wizard/types';

export function answersToDraftLocation(
  answers: Record<string, string>,
  fullUrl?: string,
): DraftLocation {
  const body = locationBodyFromAnswers(answers);
  return draftLocationEntry(
    {
      resourceType: 'Location',
      name: body.name,
      status: body.status,
      mode: body.mode,
      ...(body.partOf ? { partOf: body.partOf } : {}),
      ...(body.address ? { address: body.address } : {}),
    },
    fullUrl,
  );
}

export function draftLocationToAnswers(loc: DraftLocation): Record<string, string> {
  return {
    [LOCATION_LINK_IDS.name]: loc.resource.name,
    [LOCATION_LINK_IDS.status]: loc.resource.status,
    [LOCATION_LINK_IDS.mode]: loc.resource.mode ?? 'instance',
    [LOCATION_LINK_IDS.addressLine]: loc.resource.address?.text ?? '',
    [LOCATION_LINK_IDS.parent]: loc.resource.partOf?.reference ?? '__root__',
  };
}

/** Roots first, then children under draft parents (depth for indent). */
export function orderDraftLocations(
  locations: DraftLocation[],
): { loc: DraftLocation; depth: number }[] {
  const ids = new Set(locations.map((l) => l.fullUrl));
  const children = new Map<string | undefined, DraftLocation[]>();
  for (const loc of locations) {
    const parent = loc.resource.partOf?.reference;
    const key = parent && ids.has(parent) ? parent : undefined;
    const list = children.get(key) ?? [];
    list.push(loc);
    children.set(key, list);
  }
  const out: { loc: DraftLocation; depth: number }[] = [];
  const walk = (parent: string | undefined, depth: number): void => {
    for (const loc of children.get(parent) ?? []) {
      out.push({ loc, depth });
      walk(loc.fullUrl, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}
