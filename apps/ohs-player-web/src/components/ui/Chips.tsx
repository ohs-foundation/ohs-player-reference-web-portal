import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

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
      className={cn(
        'ohs-chip inline-flex items-center gap-1 text-sm/[1.2] text-text bg-surface',
        'border border-border rounded-pill px-3 py-2 cursor-pointer select-none',
        'transition-[background-color,border-color,color] duration-[120ms] ease-out',
        'ohs-state-layer not-disabled:hover:border-text-muted',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]',
        'aria-selected:bg-primary aria-selected:border-primary aria-selected:text-primary-contrast',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
      aria-selected={selected}
      disabled={disabled}
      onClick={() => onChange?.(!selected)}
    >
      {icon ? <span className="inline-flex" aria-hidden="true">{icon}</span> : null}
      {label}
    </button>
  );
}

export interface ChipSetProps {
  children: ReactNode;
  className?: string;
  /** Set when more than one chip can be selected at a time. */
  multiSelect?: boolean;
}

export function ChipSet({
  children,
  className,
  multiSelect,
}: Readonly<ChipSetProps>): React.ReactElement {
  return (
    <div
      role="listbox"
      aria-multiselectable={multiSelect ? true : undefined}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {children}
    </div>
  );
}
