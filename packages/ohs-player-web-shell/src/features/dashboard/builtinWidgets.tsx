import type {
  CareTeam,
  CodeableConcept,
  Location,
  Organization,
  Practitioner,
} from '@medplum/fhirtypes';
import { useTranslation } from 'ohs-player-web-core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  BarChart,
  StackedBar,
  StatusBadge,
  type DataTableColumn,
  type DonutSegment,
} from '../../components/ui';
import { useRequirement } from '../../auth/useRequirement';
import { ChartCard } from './ChartCard';
import { DistributionCard } from './DistributionCard';
import type { GatedKpi, KpiDefinition, KpiId } from './kpiCatalogue';
import { RecentCard } from './RecentCard';
import {
  useMonthlyCounts,
  useResourceStats,
  useRecent,
  type ResourceStats,
} from './useDashboardData';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface RecentWidgetProps {
  titleKey: string;
  subtitleKey: string;
}

interface RecentSpec<Row extends { id?: string }> {
  resourceType: string;
  viewAllTo: string;
  columns: (t: Translate) => DataTableColumn<Row>[];
}

const ACTIVE_COLOR = 'var(--ohs-sys-color-success)';
const INACTIVE_COLOR = 'var(--ohs-sys-color-surface-container)';
const INACTIVE_BAR_COLOR = 'var(--ohs-sys-color-outline)';

function fullName(p: Practitioner): string {
  const n = p.name?.[0];
  return `${n?.given?.join(' ') ?? ''} ${n?.family ?? ''}`.trim();
}

function codingLabel(concept: CodeableConcept | undefined): string {
  const coding = concept?.coding?.[0];
  return coding?.display ?? coding?.code ?? '—';
}

function statusBadge(active: boolean, t: Translate): ReactNode {
  return (
    <StatusBadge tone={active ? 'success' : 'neutral'} icon={<span className="ohs-badge__dot" />}>
      {active ? t('statusActive') : t('statusInactive')}
    </StatusBadge>
  );
}

function activeSplit(
  total: number | undefined,
  active: number | undefined,
  t: Translate,
): DonutSegment[] {
  const a = active ?? 0;
  const inactive = Math.max(0, (total ?? 0) - a);
  return [
    { label: t('statusActive'), value: a, color: ACTIVE_COLOR },
    { label: t('statusInactive'), value: inactive, color: INACTIVE_COLOR },
  ];
}

function idColumn<Row extends { id?: string }>(t: Translate): DataTableColumn<Row> {
  return { key: 'id', header: t('columnIdentifier'), mono: true, render: (row) => row.id ?? '—' };
}

function nameColumn<Row extends { id?: string; name?: string }>(
  t: Translate,
): DataTableColumn<Row> {
  return { key: 'name', header: t('columnName'), render: (row) => row.name ?? row.id ?? '—' };
}

function statusColumn<Row>(t: Translate, isActive: (row: Row) => boolean): DataTableColumn<Row> {
  return {
    key: 'status',
    header: t('columnStatus'),
    render: (row) => statusBadge(isActive(row), t),
  };
}

function PersonCell({ practitioner }: Readonly<{ practitioner: Practitioner }>): ReactNode {
  const name = fullName(practitioner) || (practitioner.id ?? '');
  const email = practitioner.telecom?.find((tc) => tc.system === 'email')?.value;
  return (
    <div className="ohs-dash-person">
      <Avatar name={name} />
      <span style={{ minWidth: 0 }}>
        <Link to="/users" className="ohs-dash-person__name">
          {name}
        </Link>
        {email ? <span className="ohs-dash-person__sub">{email}</span> : null}
      </span>
    </div>
  );
}

const USERS: RecentSpec<Practitioner> = {
  resourceType: 'Practitioner',
  viewAllTo: '/users',
  columns: (t) => [
    idColumn(t),
    { key: 'name', header: t('columnName'), render: (p) => <PersonCell practitioner={p} /> },
    statusColumn(t, (p) => p.active !== false),
  ],
};

const LOCATIONS: RecentSpec<Location> = {
  resourceType: 'Location',
  viewAllTo: '/locations',
  columns: (t) => [
    idColumn(t),
    nameColumn(t),
    { key: 'type', header: t('columnType'), render: (l) => codingLabel(l.physicalType) },
    statusColumn(t, (l) => l.status === 'active'),
  ],
};

const ORGANIZATIONS: RecentSpec<Organization> = {
  resourceType: 'Organization',
  viewAllTo: '/organizations',
  columns: (t) => [
    idColumn(t),
    nameColumn(t),
    { key: 'type', header: t('columnType'), render: (o) => codingLabel(o.type?.[0]) },
    statusColumn(t, (o) => o.active !== false),
  ],
};

const CARE_TEAMS: RecentSpec<CareTeam> = {
  resourceType: 'CareTeam',
  viewAllTo: '/care-teams',
  columns: (t) => [idColumn(t), nameColumn(t), statusColumn(t, (c) => c.status === 'active')],
};

function RecentWidget<Row extends { id?: string }>({
  spec,
  titleKey,
  subtitleKey,
}: Readonly<RecentWidgetProps & { spec: RecentSpec<Row> }>): ReactNode {
  const { t } = useTranslation();
  const recent = useRecent<Row>(spec.resourceType);
  return (
    <RecentCard
      title={t(titleKey)}
      subtitle={t(subtitleKey)}
      viewAllTo={spec.viewAllTo}
      columns={spec.columns(t)}
      rows={recent.rows}
      rowKey={(row) => row.id ?? ''}
      loading={recent.loading}
      error={recent.error}
    />
  );
}

export function RecentUsers(props: Readonly<RecentWidgetProps>): ReactNode {
  return <RecentWidget spec={USERS} {...props} />;
}

export function RecentLocations(props: Readonly<RecentWidgetProps>): ReactNode {
  return <RecentWidget spec={LOCATIONS} {...props} />;
}

export function RecentOrganizations(props: Readonly<RecentWidgetProps>): ReactNode {
  return <RecentWidget spec={ORGANIZATIONS} {...props} />;
}

export function RecentCareTeams(props: Readonly<RecentWidgetProps>): ReactNode {
  return <RecentWidget spec={CARE_TEAMS} {...props} />;
}

export function StatusDistribution({
  kpi,
  titleKey,
}: Readonly<{ kpi: KpiDefinition; titleKey: string }>): ReactNode {
  const { t } = useTranslation();
  const stats = useResourceStats(kpi.resourceType, kpi.activeParam);
  return (
    <DistributionCard
      title={t(titleKey)}
      loading={stats.loading}
      error={stats.error}
      segments={activeSplit(stats.total, stats.active, t)}
    />
  );
}

export function UpdatedByMonth({
  kpi,
  titleKey,
}: Readonly<{ kpi: KpiDefinition; titleKey: string }>): ReactNode {
  const { t, locale } = useTranslation();
  const counts = useMonthlyCounts(kpi.resourceType);
  const month = new Intl.DateTimeFormat(locale, { month: 'short' });
  const title = t(titleKey);
  return (
    <ChartCard
      title={title}
      loading={counts.loading}
      error={counts.error}
      empty={counts.points.every((point) => point.value === 0)}
      emptyText={t('chartEmpty')}
    >
      <BarChart
        points={counts.points.map((point) => ({
          label: month.format(point.start),
          value: point.value,
        }))}
        ariaLabel={title}
        labelHeader={t('chartMonth')}
        valueHeader={t('chartRecordsUpdated')}
      />
    </ChartCard>
  );
}

interface EntityShare {
  kpi: GatedKpi;
  stats: ResourceStats;
  visible: boolean;
}

function useShare(kpi: GatedKpi): EntityShare {
  const stats = useResourceStats(kpi.resourceType, kpi.activeParam);
  const visible = useRequirement(kpi.requires);
  return { kpi, stats, visible };
}

export type ActiveShareProps = Readonly<Record<KpiId, GatedKpi>> & { titleKey: string };

export function ActiveShare({
  users,
  locations,
  organizations,
  careTeams,
  titleKey,
}: Readonly<ActiveShareProps>): ReactNode {
  const { t } = useTranslation();
  const shares = [
    useShare(users),
    useShare(locations),
    useShare(organizations),
    useShare(careTeams),
  ].filter((share) => share.visible);
  const title = t(titleKey);
  const rows = shares.map(({ kpi, stats }) => {
    const [active, inactive] = activeSplit(stats.total, stats.active, t);
    return {
      label: t(kpi.entityKey),
      segments: [active, { ...inactive, color: INACTIVE_BAR_COLOR }],
    };
  });
  return (
    <ChartCard
      title={title}
      loading={shares.some((share) => share.stats.loading)}
      error={shares.map((share) => share.stats.error).find(Boolean)}
      empty={shares.every((share) => !share.stats.total)}
      emptyText={t('chartEmpty')}
    >
      <StackedBar rows={rows} ariaLabel={title} labelHeader={t('chartRecordType')} />
    </ChartCard>
  );
}
