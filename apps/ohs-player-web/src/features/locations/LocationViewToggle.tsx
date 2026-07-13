import { RiCheckLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';

export type LocationView = 'tree' | 'column';

export interface LocationViewToggleProps {
  value: LocationView;
  onChange: (view: LocationView) => void;
}

const VIEWS: { value: LocationView; labelKey: string }[] = [
  { value: 'tree', labelKey: 'locationsViewTree' },
  { value: 'column', labelKey: 'locationsViewColumn' },
];

export function LocationViewToggle({ value, onChange }: Readonly<LocationViewToggleProps>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('locationsViewLabel')} className="inline-grid grid-cols-2 gap-1 rounded-pill border border-border bg-surface p-1">
      {VIEWS.map((v) => {
        const active = value === v.value;
        return (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v.value)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-pill px-5 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-primary-container text-primary' : 'bg-transparent text-text-muted hover:text-text'
            }`}
          >
            {active ? <RiCheckLine size={16} aria-hidden="true" /> : null}
            {t(v.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
