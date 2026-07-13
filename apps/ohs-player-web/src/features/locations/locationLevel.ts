import type { CodeableConcept } from '@medplum/fhirtypes';

/** Backend-decided coding system for a Location's administrative level. */
export const ADMIN_LEVEL_SYSTEM = 'http://ohs.dev/codes/administrative-level';

/** FHIR R4 valueset for `Location.physicalType`. */
export const LOCATION_PHYSICAL_TYPE_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/location-physical-type';

/** Maps to the `--ohs-color-level-*` tokens. Level comes from the inline `type` coding — never tree depth. */
export type LevelTone = 'root' | 'country' | 'county' | 'subcounty' | 'ward' | 'facility' | 'unit';

interface LevelMeta {
  tone: LevelTone;
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

/** Unknown codes fall back to the neutral `unit` tone so odd import data never crashes a row. */
export function levelFromType(type: CodeableConcept[] | undefined): LocationLevel | null {
  const codings = (type ?? []).flatMap((t) => t.coding ?? []);
  const coding = codings.find((c) => c.system === ADMIN_LEVEL_SYSTEM && c.code);
  const code = coding?.code?.toLowerCase();
  if (!code) return null;
  const meta = LEVELS[code];
  if (!meta) return { code, tone: 'unit', labelKey: 'locationLevelUnknown' };
  return { code, tone: meta.tone, labelKey: meta.labelKey };
}

/** Live imports emit code 'other' with odd displays ('Jdn') — shown as-is, no clean-valueset assumption. */
export function physicalTypesFromConcept(physicalType: CodeableConcept | null | undefined): string[] {
  const codings = (physicalType?.coding ?? []).filter(
    (c) => c.system === LOCATION_PHYSICAL_TYPE_SYSTEM && (c.code || c.display),
  );
  return codings.map((c) => (c.display ?? c.code ?? '').toLowerCase()).filter(Boolean);
}
