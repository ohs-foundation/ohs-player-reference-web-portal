import {
  PermissionGuard,
  useSearch,
  useTranslation,
} from 'ohs-player-web-core';
import { Card, CardHeader, Inline, LinearProgress, Page, PageHeader, Spinner, Stack } from '../components/ui';
import { Link } from 'react-router-dom';

type CountBundle = { total?: number };

function StatCard({
  label,
  total,
  loading,
}: Readonly<{ label: string; total: number | undefined; loading: boolean }>) {
  return (
    <Card style={{ flex: '1 1 180px', minWidth: 160 }}>
      <dl style={{ margin: 0 }}>
        <dt
          style={{
            fontSize: 'var(--ohs-text-label, 14px)',
            color: 'var(--ohs-color-text-muted)',
            fontWeight: 500,
            marginBottom: 'var(--ohs-spacing-2, 8px)',
          }}
        >
          {label}
        </dt>
        <dd
          style={{
            margin: 0,
            fontSize: 'var(--ohs-text-display, 32px)',
            fontWeight: 700,
            color: 'var(--ohs-color-text)',
            lineHeight: 1.1,
            minHeight: '1.3em',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {loading ? (
            <Spinner />
          ) : (
            (total ?? '—')
          )}
        </dd>
      </dl>
    </Card>
  );
}

interface QuickLink {
  to: string;
  label: string;
  description: string;
}

function QuickLinkCard({ to, label, description }: Readonly<QuickLink>) {
  return (
    <Link to={to} style={{ flex: '1 1 200px', minWidth: 180, textDecoration: 'none' }}>
      <Card style={{ height: '100%', transition: 'border-color 120ms ease, box-shadow 120ms ease' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'var(--ohs-color-primary)';
          el.style.boxShadow = 'var(--ohs-shadow-md, 0 4px 12px rgba(15,23,42,.15))';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }}
      >
        <CardHeader
          title={<span style={{ color: 'var(--ohs-color-primary)' }}>{label}</span>}
          description={description}
        />
      </Card>
    </Link>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const pract = useSearch('Practitioner', { _summary: 'count', active: 'true' });
  const loc = useSearch('Location', { _summary: 'count', status: 'active' });
  const ct = useSearch('CareTeam', { _summary: 'count', status: 'active' });

  const pt = pract.data as CountBundle | undefined;
  const lt = loc.data as CountBundle | undefined;
  const ctT = ct.data as CountBundle | undefined;

  const quickLinks: QuickLink[] = [
    { to: '/users', label: t('navUsers'), description: t('pageUsersDescription') },
    { to: '/locations', label: t('navLocations'), description: t('pageLocationsDescription') },
    { to: '/organizations', label: t('navOrganizations'), description: t('pageOrganizationsDescription') },
    { to: '/care-teams', label: t('navCareTeams'), description: t('pageCareTeamsDescription') },
  ];

  const anyLoading = pract.isLoading || loc.isLoading || ct.isLoading;

  return (
    <Page>
      <PageHeader title={t('pageDashboard')} description={t('pageDashboardDescription')} />
      {anyLoading ? <LinearProgress style={{ marginBottom: 'var(--ohs-spacing-4, 16px)' }} /> : null}
      <PermissionGuard permission="dashboard.view">
        <Stack gap={5}>
          <section aria-label="Summary statistics">
            <Inline justify="start" style={{ flexWrap: 'wrap', gap: 'var(--ohs-spacing-3, 12px)' }}>
              <StatCard
                label={t('countActivePractitioners')}
                total={pt?.total}
                loading={pract.isLoading}
              />
              <StatCard
                label={t('countActiveLocations')}
                total={lt?.total}
                loading={loc.isLoading}
              />
              <StatCard
                label={t('countActiveCareTeams')}
                total={ctT?.total}
                loading={ct.isLoading}
              />
            </Inline>
          </section>

          <section aria-labelledby="quick-links-heading">
            <h3
              id="quick-links-heading"
              style={{
                fontSize: 'var(--ohs-text-title, 18px)',
                fontWeight: 600,
                margin: '0 0 var(--ohs-spacing-3, 12px)',
                color: 'var(--ohs-color-text)',
              }}
            >
              {t('dashboardQuickLinks')}
            </h3>
            <Inline justify="start" style={{ flexWrap: 'wrap', gap: 'var(--ohs-spacing-3, 12px)' }}>
              {quickLinks.map((ql) => (
                <QuickLinkCard key={ql.to} {...ql} />
              ))}
            </Inline>
          </section>
        </Stack>
      </PermissionGuard>
    </Page>
  );
}
