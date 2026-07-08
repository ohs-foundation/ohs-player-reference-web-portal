import { useTranslation } from 'ohs-player-web-core';
import type { LevelTone } from './locationLevel';

const TONE_STYLE: Record<LevelTone, string> = {
  root: 'bg-[var(--ohs-color-level-root-bg)] border-[var(--ohs-color-level-root-border)] text-[var(--ohs-color-level-root-text)]',
  country:
    'bg-[var(--ohs-color-level-country-bg)] border-[var(--ohs-color-level-country-border)] text-[var(--ohs-color-level-country-text)]',
  county:
    'bg-[var(--ohs-color-level-county-bg)] border-[var(--ohs-color-level-county-border)] text-[var(--ohs-color-level-county-text)]',
  subcounty:
    'bg-[var(--ohs-color-level-subcounty-bg)] border-[var(--ohs-color-level-subcounty-border)] text-[var(--ohs-color-level-subcounty-text)]',
  ward: 'bg-[var(--ohs-color-level-ward-bg)] border-[var(--ohs-color-level-ward-border)] text-[var(--ohs-color-level-ward-text)]',
  facility:
    'bg-[var(--ohs-color-level-facility-bg)] border-[var(--ohs-color-level-facility-border)] text-[var(--ohs-color-level-facility-text)]',
  unit: 'bg-[var(--ohs-color-level-unit-bg)] border-[var(--ohs-color-level-unit-border)] text-[var(--ohs-color-level-unit-text)]',
};

export interface LocationLevelBadgeProps {
  tone: LevelTone;
  labelKey: string;
}

export function LocationLevelBadge({ tone, labelKey }: Readonly<LocationLevelBadgeProps>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-xs font-medium ${TONE_STYLE[tone]}`}
    >
      {t(labelKey)}
    </span>
  );
}

export interface PhysicalTypeChipProps {
  label: string;
}

/** Neutral outline chip, lowercase, for a Location.physicalType display value. */
export function PhysicalTypeChip({ label }: Readonly<PhysicalTypeChipProps>): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-pill border border-border-tertiary px-2 py-0.5 text-xs lowercase text-text-muted">
      {label}
    </span>
  );
}
