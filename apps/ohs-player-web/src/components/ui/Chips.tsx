import { type ReactNode } from 'react';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  onChange?: (selected: boolean) => void;
  disabled?: boolean;
  icon?: ReactNode;
}

export function FilterChip({ label, selected, onChange, disabled, icon }: Readonly<FilterChipProps>): React.ReactElement {
  return (
    <button
      type="button"
      role="option"
      className="ohs-chip"
      aria-selected={selected}
      disabled={disabled}
      onClick={() => onChange?.(!selected)}
    >
      {icon ? <span className="ohs-chip__icon" aria-hidden="true">{icon}</span> : null}
      {label}
    </button>
  );
}

export interface ChipSetProps {
  children: ReactNode;
  className?: string;
}

export function ChipSet({ children, className }: Readonly<ChipSetProps>): React.ReactElement {
  return (
    <div role="listbox" aria-multiselectable="true" className={['ohs-chip-set', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
