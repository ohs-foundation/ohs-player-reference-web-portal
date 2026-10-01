import type { Location } from '@medplum/fhirtypes';
import { describe, expect, it } from 'vitest';
import { locationOptions, locationsFromBundle } from './userFormOptions';

const t = (key: string): string => key;
const location = (fields: Partial<Location>): Location => ({ resourceType: 'Location', ...fields });

describe('locationOptions', () => {
  it('labels an active location with its bare name', () => {
    expect(locationOptions([location({ id: 'l1', name: 'Nairobi', status: 'active' })], t)).toEqual(
      [{ value: 'Location/l1', label: 'Nairobi' }],
    );
  });

  it('appends the status to a suspended and an inactive location', () => {
    expect(
      locationOptions(
        [
          location({ id: 'l1', name: 'Nairobi', status: 'suspended' }),
          location({ id: 'l2', name: 'Nairobi', status: 'inactive' }),
        ],
        t,
      ).map((o) => o.label),
    ).toEqual(['Nairobi (locationStatusSuspended)', 'Nairobi (locationStatusInactive)']);
  });

  it('labels a location with no status with its bare name', () => {
    expect(locationOptions([location({ id: 'l1', name: 'Nairobi' })], t)).toEqual([
      { value: 'Location/l1', label: 'Nairobi' },
    ]);
  });

  it('falls back to the id for a missing or blank name', () => {
    expect(
      locationOptions([location({ id: 'l1' }), location({ id: 'l2', name: '  ' })], t).map(
        (o) => o.label,
      ),
    ).toEqual(['l1', 'l2']);
  });

  it('keeps the first of two entries with the same id and skips one with no id', () => {
    expect(
      locationOptions(
        [
          location({ id: 'l1', name: 'Kept', status: 'inactive' }),
          location({ id: 'l1', name: 'Dropped', status: 'active' }),
          location({ name: 'No id' }),
        ],
        t,
      ),
    ).toEqual([{ value: 'Location/l1', label: 'Kept (locationStatusInactive)' }]);
  });
});

describe('locationsFromBundle', () => {
  it('returns the Location resources and ignores other entries and an empty bundle', () => {
    const bundle = {
      entry: [
        { resource: { resourceType: 'Location', id: 'l1' } },
        { resource: { resourceType: 'Organization', id: 'o1' } },
        {},
      ],
    };
    expect(locationsFromBundle(bundle).map((l) => l.id)).toEqual(['l1']);
    expect(locationsFromBundle(undefined)).toEqual([]);
    expect(locationsFromBundle({})).toEqual([]);
  });
});
