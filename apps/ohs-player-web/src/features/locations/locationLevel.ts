import type { Location } from '@medplum/fhirtypes';

/** Backend-decided coding system for a Location's administrative level. */
export const ADMIN_LEVEL_SYSTEM = 'http://ohs.dev/codes/administrative-level';

/** FHIR R4 valueset for `Location.physicalType`. */
export const LOCATION_PHYSICAL_TYPE_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/location-physical-type';

/**
 * Administrative-level badge tone. Values map to the `--ohs-color-level-*` tokens (theme.css, light + dark);
 * `LocationLevelBadge` resolves the tone to those tokens. Keep this the ONE place code→label→tone lives —
 * do NOT derive level from tree depth (backend puts it on `Location.type`).
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

/** Read the administrative level from a Location's `type` coding; null when absent/unrecognised. */
export function levelFromLocation(location: Location | undefined): LocationLevel | null {
  const codings = (location?.type ?? []).flatMap((t) => t.coding ?? []);
  const coding = codings.find((c) => c.system === ADMIN_LEVEL_SYSTEM && c.code);
  const code = coding?.code?.toLowerCase();
  if (!code) return null;
  const meta = LEVELS[code];
  if (!meta) return { code, tone: 'unit', labelKey: 'locationLevelUnknown' };
  return { code, tone: meta.tone, labelKey: meta.labelKey };
}

/**
 * Physical-type codes from `Location.physicalType` (FHIR R4 valueset). Rendered lowercase; values outside
 * the valueset come back as `other`.
 */
export function physicalTypesFromLocation(location: Location | undefined): string[] {
  const codings = (location?.physicalType?.coding ?? []).filter(
    (c) => c.system === LOCATION_PHYSICAL_TYPE_SYSTEM && (c.code || c.display),
  );
  return codings.map((c) => (c.display ?? c.code ?? '').toLowerCase()).filter(Boolean);
}
