import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVIGATION, type NavEntry } from '../../config/navigation';
import { gatedKpis, KPI_CATALOGUE } from './kpiCatalogue';

const requiresOf = (navigation: readonly NavEntry[], id: string) =>
  gatedKpis(navigation).find((kpi) => kpi.id === id)?.requires;

describe('gatedKpis', () => {
  it('keeps catalogue order: users, locations, organisations, care teams', () => {
    expect(KPI_CATALOGUE.map((kpi) => kpi.id)).toEqual([
      'users',
      'locations',
      'organizations',
      'careTeams',
    ]);
  });

  it('takes each requirement from the matching nav entry', () => {
    expect(requiresOf(DEFAULT_NAVIGATION, 'careTeams')).toEqual({
      flag: 'careTeams',
      permission: 'careteams.view',
    });
  });

  it('follows a document that rewrites a nav entry', () => {
    const navigation = DEFAULT_NAVIGATION.map((entry) =>
      entry.id === 'users'
        ? { ...entry, requires: { flag: 'staff', permission: 'staff.view' } }
        : entry,
    );

    expect(requiresOf(navigation, 'users')).toEqual({ flag: 'staff', permission: 'staff.view' });
  });

  it('falls back to the shell default when the document leaves the entry out', () => {
    const navigation = DEFAULT_NAVIGATION.filter((entry) => entry.id !== 'locations');

    expect(requiresOf(navigation, 'locations')).toEqual({
      flag: 'locationMgmt',
      permission: 'locations.view',
    });
  });

  it('leaves a KPI ungated when its document entry declares no requirement', () => {
    const navigation: NavEntry[] = [{ id: 'users', to: '/users', labelKey: 'navUsers', order: 10 }];

    expect(requiresOf(navigation, 'users')).toBeUndefined();
  });
});
