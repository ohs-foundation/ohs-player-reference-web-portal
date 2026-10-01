import { describe, expect, it } from 'vitest';
import { resourceTypeLabel } from './resourceTypeLabel';

const catalogue: Record<string, string> = { resourceTypePractitioner: 'Staff' };
const t = (key: string): string => catalogue[key] ?? key;

describe('resourceTypeLabel', () => {
  it('names a type with its resourceType<Type> message', () => {
    expect(resourceTypeLabel(t, 'Practitioner')).toBe('Staff');
  });

  it('falls back to the FHIR type name when the catalogue has no label', () => {
    expect(resourceTypeLabel(t, 'Schedule')).toBe('Schedule');
  });
});
