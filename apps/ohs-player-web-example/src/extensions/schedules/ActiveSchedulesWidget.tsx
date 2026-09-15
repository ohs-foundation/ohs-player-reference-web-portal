import type { Bundle } from '@medplum/fhirtypes';
import { useSearch, useTranslation } from 'ohs-player-web-core';
import { IconToday, StatCard } from 'ohs-player-web-shell';

export default function ActiveSchedulesWidget(): React.ReactElement {
  const { t } = useTranslation();
  const active = useSearch('Schedule', { active: 'true', _summary: 'count' });

  return (
    <StatCard
      label={t('schedulesKpi')}
      value={(active.data as Bundle | undefined)?.total}
      loading={active.isLoading}
      badgeColor="var(--ohs-sys-color-primary-container)"
      glyph={IconToday}
    />
  );
}
