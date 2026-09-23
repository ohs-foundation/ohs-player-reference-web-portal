import { describe, expect, it } from 'vitest';
import type { KpiId } from './kpiCatalogue';
import { DEFAULT_KPIS, MAX_KPIS, sanitizeKpis, toggleKpi, visibleFirst } from './kpiSelection';

describe('toggleKpi', () => {
  it('ticks an unticked id and unticks a ticked one', () => {
    expect(toggleKpi(['users'], 'locations')).toEqual(['users', 'locations']);
    expect(toggleKpi(['users', 'locations'], 'users')).toEqual(['locations']);
  });

  it('rejects a fifth id once four are ticked', () => {
    const four: KpiId[] = ['users', 'locations', 'organizations', 'careTeams'];
    const fifth = 'fhirResources' as KpiId;

    expect(toggleKpi(four, fifth)).toBe(four);
    expect(MAX_KPIS).toBe(4);
  });

  it('honours a lower max', () => {
    expect(toggleKpi(['users', 'locations'], 'careTeams', 2)).toEqual(['users', 'locations']);
  });

  it('counts only the ids that pass `counts` against the limit', () => {
    const visible = (id: KpiId) => id !== 'careTeams';

    expect(toggleKpi(['careTeams', 'users'], 'locations', 2, visible)).toEqual([
      'careTeams',
      'users',
      'locations',
    ]);
    expect(toggleKpi(['careTeams', 'users', 'locations'], 'organizations', 2, visible)).toEqual([
      'careTeams',
      'users',
      'locations',
    ]);
  });
});

describe('visibleFirst', () => {
  it('moves hidden ids after visible ones and keeps each group in order', () => {
    const visible = (id: KpiId) => id !== 'careTeams' && id !== 'users';

    expect(visibleFirst(['careTeams', 'locations', 'users', 'organizations'], visible)).toEqual([
      'locations',
      'organizations',
      'careTeams',
      'users',
    ]);
  });
});

describe('sanitizeKpis', () => {
  it('reads anything that is not an array as the default selection', () => {
    expect(sanitizeKpis(null)).toEqual(DEFAULT_KPIS);
    expect(sanitizeKpis({ users: true })).toEqual(DEFAULT_KPIS);
  });

  it('keeps an empty selection empty', () => {
    expect(sanitizeKpis([])).toEqual([]);
  });

  it('drops unknown and duplicate ids and trims to the first four valid ones', () => {
    const tampered = [
      'bogus',
      'careTeams',
      'users',
      'users',
      42,
      'locations',
      'organizations',
      'more',
    ];

    expect(sanitizeKpis(tampered)).toEqual(['careTeams', 'users', 'locations', 'organizations']);
  });

  it('trims an over-limit list of known ids to the first four', () => {
    const five = ['users', 'locations', 'organizations', 'careTeams', 'users'];

    expect(sanitizeKpis(five)).toHaveLength(MAX_KPIS);
  });
});
