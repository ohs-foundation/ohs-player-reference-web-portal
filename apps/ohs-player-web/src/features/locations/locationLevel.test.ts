import { describe, expect, it } from 'vitest';
import type { Location } from '@medplum/fhirtypes';
import { ADMIN_LEVEL_SYSTEM, levelFromLocation, physicalTypesFromLocation } from './locationLevel';

function withType(code: string): Location {
  return { resourceType: 'Location', type: [{ coding: [{ system: ADMIN_LEVEL_SYSTEM, code }] }] };
}

describe('levelFromLocation', () => {
  it('reads the level from Location.type (not tree depth) and maps to a tone', () => {
    expect(levelFromLocation(withType('county'))).toMatchObject({ code: 'county', tone: 'county' });
    expect(levelFromLocation(withType('sub-county'))).toMatchObject({ tone: 'subcounty' });
    expect(levelFromLocation(withType('FACILITY'))).toMatchObject({ tone: 'facility' });
  });

  it('falls back to a generic tone for unknown codes, and null when absent', () => {
    expect(levelFromLocation(withType('district'))).toMatchObject({ code: 'district', labelKey: 'locationLevelUnknown' });
    expect(levelFromLocation({ resourceType: 'Location' })).toBeNull();
    expect(levelFromLocation(undefined)).toBeNull();
  });

  it('ignores codings from other systems', () => {
    const loc: Location = {
      resourceType: 'Location',
      type: [{ coding: [{ system: 'http://example.org/other', code: 'county' }] }],
    };
    expect(levelFromLocation(loc)).toBeNull();
  });
});

describe('physicalTypesFromLocation', () => {
  it('returns lowercased display values from the R4 physical-type valueset', () => {
    const loc: Location = {
      resourceType: 'Location',
      physicalType: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'bu', display: 'Building' }],
      },
    };
    expect(physicalTypesFromLocation(loc)).toEqual(['building']);
    expect(physicalTypesFromLocation(undefined)).toEqual([]);
  });
});
