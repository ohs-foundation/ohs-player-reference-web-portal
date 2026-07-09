import type { CodeableConcept } from '@medplum/fhirtypes';

/** Backend-decided coding system for a Location's administrative level. */
export const ADMIN_LEVEL_SYSTEM = 'http://ohs.dev/codes/administrative-level';

/** FHIR R4 valueset for `Location.physicalType`. */
export const LOCATION_PHYSICAL_TYPE_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/location-physical-type';

/**
 * Administrative-level badge tone. Values map to the `--ohs-color-level-*` tokens (theme.css, light + dark).
 * Keep this the ONE place code→label→tone lives — level comes from the node's inline `type` CodeableConcept
 * (do NOT derive it from tree depth). `root` is applied by the caller for the requested root (partOf null).
 */
export type LevelTone = 'root' | 'country' | 'county' | 'subcounty' | 'ward' | 'facility' | 'unit';

interface LevelMeta {
  tone: LevelTone;
  /** i18n key for the human label. */
  labelKey: string;
}

const LEVELS: Record<string, LevelMeta> = {
  country: { tone: 'country', labelKey: 'locationLevelCountry' },
  county: { tone: 'county', labelKey: 'locationLevelCounty' },
  'sub-county': { tone: 'subcounty', labelKey: 'locationLevelSubCounty' },
  subcounty: { tone: 'subcounty', labelKey: 'locationLevelSubCounty' },
  ward: { tone: 'ward', labelKey: 'locationLevelWard' },
  facility: { tone: 'facility', labelKey: 'locationLevelFacility' },
  unit: { tone: 'unit', labelKey: 'locationLevelUnit' },
};

export interface LocationLevel {
  code: string;
  tone: LevelTone;
  labelKey: string;
}

/**
 * Read the administrative level from a node's inline `type` codings. Unknown/missing codes fall back to a
 * neutral outline badge (`unit` tone) so odd import data never crashes the row. `null` when there is no
 * admin-level coding at all.
 */
export function levelFromType(type: CodeableConcept[] | undefined): LocationLevel | null {
  const codings = (type ?? []).flatMap((t) => t.coding ?? []);
  const coding = codings.find((c) => c.system === ADMIN_LEVEL_SYSTEM && c.code);
  const code = coding?.code?.toLowerCase();
  if (!code) return null;
  const meta = LEVELS[code];
  if (!meta) return { code, tone: 'unit', labelKey: 'locationLevelUnknown' };
  return { code, tone: meta.tone, labelKey: meta.labelKey };
}

/**
 * Physical-type display values from an inline `physicalType` CodeableConcept, lowercased. Rendered defensively:
 * the live import currently emits `code: "other"` with odd displays ("Jdn", "Bu"), so the display is shown
 * as-is (no clean-valueset assumption).
 */
export function physicalTypesFromConcept(physicalType: CodeableConcept | null | undefined): string[] {
  const codings = (physicalType?.coding ?? []).filter(
    (c) => c.system === LOCATION_PHYSICAL_TYPE_SYSTEM && (c.code || c.display),
  );
  return codings.map((c) => (c.display ?? c.code ?? '').toLowerCase()).filter(Boolean);
}
