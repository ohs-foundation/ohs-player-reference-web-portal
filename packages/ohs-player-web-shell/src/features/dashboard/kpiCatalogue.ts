import {
  IconAccountCircleFill,
  IconBriefcaseFill,
  IconMapPinFill,
  IconTeamFill,
  type IconComponent,
} from '../../components/ui/icons';
import { DEFAULT_NAVIGATION, type NavEntry, type NavId } from '../../config/navigation';
import type { Requirement } from '../../auth/useRequirement';

export type KpiId = 'users' | 'locations' | 'organizations' | 'careTeams';

/** One card the dashboard KPI row can show; the row and the picker both read this list. */
export interface KpiDefinition {
  id: KpiId;
  /** The sidebar entry whose `requires` also gate this KPI. */
  navId: NavId;
  order: number;
  labelKey: string;
  optionKey: string;
  resourceType: string;
  activeParam: Record<string, string>;
  badgeColor: string;
  glyph: IconComponent;
}

export type GatedKpi = KpiDefinition & { requires: Requirement };

/* Badge fills are decorative per-KPI colours from the design, so they sit outside the themed roles. */
export const KPI_CATALOGUE: readonly KpiDefinition[] = [
  {
    id: 'users',
    navId: 'users',
    order: 10,
    labelKey: 'kpiTotalUsers',
    optionKey: 'navUsers',
    resourceType: 'Practitioner',
    activeParam: { active: 'true' },
    badgeColor: '#D398E6',
    glyph: IconAccountCircleFill,
  },
  {
    id: 'locations',
    navId: 'locations',
    order: 20,
    labelKey: 'kpiTotalLocations',
    optionKey: 'navLocations',
    resourceType: 'Location',
    activeParam: { status: 'active' },
    badgeColor: '#E89271',
    glyph: IconMapPinFill,
  },
  {
    id: 'organizations',
    navId: 'organizations',
    order: 30,
    labelKey: 'kpiTotalOrganizations',
    optionKey: 'navOrganizations',
    resourceType: 'Organization',
    activeParam: { active: 'true' },
    badgeColor: '#70A1E5',
    glyph: IconBriefcaseFill,
  },
  {
    id: 'careTeams',
    navId: 'careTeams',
    order: 40,
    labelKey: 'kpiTotalCareTeams',
    optionKey: 'navCareTeams',
    resourceType: 'CareTeam',
    activeParam: { status: 'active' },
    badgeColor: '#F0C274',
    glyph: IconTeamFill,
  },
];

/** Each KPI with its nav entry's `requires`, read from the resolved navigation, else the shell default. */
export function gatedKpis(navigation: readonly NavEntry[]): GatedKpi[] {
  return KPI_CATALOGUE.map((kpi) => {
    const entry =
      navigation.find((e) => e.id === kpi.navId) ??
      DEFAULT_NAVIGATION.find((e) => e.id === kpi.navId);
    return { ...kpi, requires: entry?.requires };
  });
}
