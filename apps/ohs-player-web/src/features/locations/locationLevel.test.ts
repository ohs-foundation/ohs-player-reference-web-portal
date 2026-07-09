import { describe, expect, it } from 'vitest';
import type { CodeableConcept } from '@medplum/fhirtypes';
import { ADMIN_LEVEL_SYSTEM, levelFromType, physicalTypesFromConcept } from './locationLevel';

function levelType(code: string): CodeableConcept[] {
  return [{ coding: [{ system: ADMIN_LEVEL_SYSTEM, code }] }];
}

describe('levelFromType', () => {
  it('reads the level from inline type codings and maps to a tone', () => {
    expect(levelFromType(levelType('county'))).toMatchObject({ code: 'county', tone: 'county' });
    expect(levelFromType(levelType('sub-county'))).toMatchObject({ tone: 'subcounty' });
    expect(levelFromType(levelType('FACILITY'))).toMatchObject({ tone: 'facility' });
  });

  it('falls back to a neutral tone for unknown codes, and null when absent', () => {
    expect(levelFromType(levelType('district'))).toMatchObject({ code: 'district', tone: 'unit', labelKey: 'locationLevelUnknown' });
    expect(levelFromType([])).toBeNull();
    expect(levelFromType(undefined)).toBeNull();
  });

  it('ignores codings from other systems', () => {
    expect(levelFromType([{ coding: [{ system: 'http://example.org/other', code: 'county' }] }])).toBeNull();
  });
});

describe('physicalTypesFromConcept', () => {
  it('returns lowercased display values from the R4 physical-type valueset', () => {
    const pt: CodeableConcept = {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'bu', display: 'Building' }],
    };
    expect(physicalTypesFromConcept(pt)).toEqual(['building']);
  });

  it("renders odd import data (code 'other' with display 'Jdn') as-is, lowercased", () => {
    const pt: CodeableConcept = {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'other', display: 'Jdn' }],
    };
    expect(physicalTypesFromConcept(pt)).toEqual(['jdn']);
    expect(physicalTypesFromConcept(null)).toEqual([]);
    expect(physicalTypesFromConcept(undefined)).toEqual([]);
  });
});
