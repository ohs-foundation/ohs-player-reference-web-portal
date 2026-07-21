import { describe, expect, it } from 'vitest';
import {
  RESOURCE_TYPE_DEFS,
  displayNameFor,
  genericDisplayName,
  idReference,
  resourceTypeDef,
  avatarInitials,
} from './registry';
import { CAPABILITY_STATEMENT_TYPES } from './__fixtures__/capabilityStatementTypes';

const backendTypes = new Set(CAPABILITY_STATEMENT_TYPES);

describe('FHIR Viewer registry — FHIR-only guard', () => {
  it('lists 34 types in the design order (Patient first, Task last)', () => {
    expect(RESOURCE_TYPE_DEFS).toHaveLength(34);
    expect(RESOURCE_TYPE_DEFS[0].resourceType).toBe('Patient');
    expect(RESOURCE_TYPE_DEFS.at(-1)?.resourceType).toBe('Task');
  });

  it('every entry is a real FHIR type present in the backend CapabilityStatement', () => {
    for (const def of RESOURCE_TYPE_DEFS) {
      expect(backendTypes.has(def.resourceType), `${def.resourceType} not in CapabilityStatement`).toBe(true);
    }
  });

  it('has no duplicate types and derives each label key from the resourceType', () => {
    const seen = new Set<string>();
    for (const def of RESOURCE_TYPE_DEFS) {
      expect(seen.has(def.resourceType)).toBe(false);
      seen.add(def.resourceType);
      expect(def.labelKey).toBe(`fhirType${def.resourceType}`);
    }
  });

  it('maps the mislabeled "Medication Required" design entry to MedicationRequest', () => {
    expect(RESOURCE_TYPE_DEFS.some((d) => d.resourceType === 'MedicationRequest')).toBe(true);
    expect(backendTypes.has('MedicationRequest')).toBe(true);
  });

  it('resolves a def by type and returns undefined for unknown/non-FHIR types', () => {
    expect(resourceTypeDef('Organization')?.resourceType).toBe('Organization');
    expect(resourceTypeDef('MedicationRequired')).toBeUndefined();
    expect(resourceTypeDef(undefined)).toBeUndefined();
  });
});

describe('display derivation', () => {
  it('joins a HumanName for name-bearing person types', () => {
    const patient = { resourceType: 'Patient', id: 'p1', name: [{ given: ['Faith'], family: 'Atieno' }] };
    expect(genericDisplayName(patient)).toBe('Faith Atieno');
  });

  it('uses the string name for Organization/Location/CareTeam', () => {
    expect(genericDisplayName({ resourceType: 'Organization', id: 'o1', name: 'Demo Health' })).toBe('Demo Health');
  });

  it('falls back to a code display, then to Type/id', () => {
    const obs = { resourceType: 'Observation', id: 'ob1', code: { coding: [{ display: 'Body weight' }] } };
    expect(genericDisplayName(obs)).toBe('Body weight');
    expect(genericDisplayName({ resourceType: 'Task', id: 't1' })).toBe('Task/t1');
    expect(idReference({ resourceType: 'Task', id: 't1' })).toBe('Task/t1');
  });

  it('displayNameFor honours a per-type override', () => {
    const def = { resourceType: 'Task', labelKey: 'fhirTypeTask', searchParam: '_id' as const, displayName: () => 'Custom' };
    expect(displayNameFor(def, { resourceType: 'Task', id: 't1' })).toBe('Custom');
  });

  it('derives avatar initials from a display name', () => {
    expect(avatarInitials('Faith Atieno')).toBe('FA');
    expect(avatarInitials('Demo Health Organization')).toBe('DH');
    expect(avatarInitials('Task/t1')).toBe('TA');
  });
});
