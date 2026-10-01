import { useTranslation } from 'ohs-player-web-core';
import { FilterChip, FilterChipBar, LinearProgress } from 'ohs-player-web-shell';
import { todayIso } from '../users/userFormSchema';
import { AUDIT_ACTIONS, type AuditFilters, isRangeInverted } from './auditFilters';
import { actionLabelKey } from './auditPresentation';
import type { AuditFilterSetters } from './useAuditFilters';

interface AuditFilterBarProps {
  filters: AuditFilters;
  setters: AuditFilterSetters;
  hasFilters: boolean;
  onClearAll: () => void;
  refreshing: boolean;
}

export function AuditFilterBar({
  filters,
  setters,
  hasFilters,
  onClearAll,
  refreshing,
}: Readonly<AuditFilterBarProps>): React.ReactElement {
  const { t } = useTranslation();
  const today = todayIso();

  return (
    <div className="flex flex-col gap-3 w-full">
      <FilterChipBar clearVisible={hasFilters} onClearAll={onClearAll}>
        <FilterChip
          label={t('auditFilterAction')}
          allLabel={t('auditFilterActionAll')}
          options={AUDIT_ACTIONS.map((action) => ({
            value: action,
            label: t(actionLabelKey(action)),
          }))}
          value={filters.action}
          onChange={setters.action}
        />
        <FilterChip
          variant="text"
          label={t('auditFilterResourceType')}
          hint={t('auditFilterResourceTypeHint')}
          value={filters.resourceType}
          onChange={setters.resourceType}
        />
        <FilterChip
          variant="text"
          label={t('auditFilterAgent')}
          hint={t('auditFilterAgentHint')}
          value={filters.agent}
          onChange={setters.agent}
        />
        <FilterChip
          variant="text"
          label={t('auditFilterFrom')}
          value={filters.from}
          onChange={setters.from}
          input={{ type: 'date', max: filters.to ?? today }}
        />
        <FilterChip
          variant="text"
          label={t('auditFilterTo')}
          value={filters.to}
          onChange={setters.to}
          input={{ type: 'date', min: filters.from ?? undefined, max: today }}
        />
      </FilterChipBar>
      {isRangeInverted(filters.from, filters.to) ? (
        <p role="alert" className="m-0 text-sm text-error">
          {t('auditFilterRangeError')}
        </p>
      ) : null}
      {refreshing ? <LinearProgress label={t('auditRefreshing')} /> : null}
    </div>
  );
}
