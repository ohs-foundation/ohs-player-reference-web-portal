import { RiCheckLine, RiFilterLine } from '@remixicon/react';
import { OhsDropdownMenu, useTranslation } from 'ohs-player-web-core';

export type LocationStatusFilter = 'all' | 'active' | 'suspended' | 'inactive';

export interface LocationFilterMenuProps {
  value: LocationStatusFilter;
  onChange: (value: LocationStatusFilter) => void;
}

const OPTIONS: { value: LocationStatusFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'locationsFilterAll' },
  { value: 'active', labelKey: 'locationStatusActive' },
  { value: 'suspended', labelKey: 'locationStatusSuspended' },
  { value: 'inactive', labelKey: 'locationStatusInactive' },
];

export function LocationFilterMenu({ value, onChange }: Readonly<LocationFilterMenuProps>): React.ReactElement {
  const { t } = useTranslation();
  const active = value !== 'all';
  return (
    <OhsDropdownMenu.Root>
      <OhsDropdownMenu.Trigger asChild>
        <button
          type="button"
          className={`inline-flex h-12 items-center gap-2 rounded-pill border px-5 text-sm font-medium transition-colors ${
            active ? 'border-primary bg-primary-container text-primary' : 'border-border-secondary bg-surface text-text hover:border-text-muted'
          }`}
        >
          <RiFilterLine size={18} aria-hidden="true" />
          {t('locationsFilterButton')}
        </button>
      </OhsDropdownMenu.Trigger>
      <OhsDropdownMenu.Portal>
        <OhsDropdownMenu.Content className="ohs-dropdown-content" sideOffset={6} align="start">
          <OhsDropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            {t('locationsFilterStatus')}
          </OhsDropdownMenu.Label>
          {OPTIONS.map((o) => (
            <OhsDropdownMenu.Item
              key={o.value}
              className="ohs-dropdown-item flex items-center justify-between gap-6"
              onSelect={() => onChange(o.value)}
            >
              {t(o.labelKey)}
              {value === o.value ? <RiCheckLine size={16} className="text-primary" aria-hidden="true" /> : null}
            </OhsDropdownMenu.Item>
          ))}
        </OhsDropdownMenu.Content>
      </OhsDropdownMenu.Portal>
    </OhsDropdownMenu.Root>
  );
}
