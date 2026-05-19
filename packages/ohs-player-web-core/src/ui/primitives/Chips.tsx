import { useEffect, useRef, type ReactNode } from 'react';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  onChange?: (selected: boolean) => void;
  disabled?: boolean;
  elevated?: boolean;
  icon?: ReactNode;
}

type MdFilterChipEl = HTMLElement & { selected: boolean };

export function FilterChip({
  label,
  selected,
  onChange,
  disabled,
  elevated,
  icon,
}: FilterChipProps): React.ReactElement {
  const ref = useRef<MdFilterChipEl | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.selected = Boolean(selected);
  }, [selected]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    const handler = (): void => onChange(el.selected);
    el.addEventListener('change', handler);
    return (): void => el.removeEventListener('change', handler);
  }, [onChange]);

  return (
    <md-filter-chip
      ref={ref as React.RefObject<HTMLElement>}
      label={label}
      disabled={disabled || undefined}
      elevated={elevated || undefined}
    >
      {icon ? (
        <span slot="icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </md-filter-chip>
  );
}

export interface ChipSetProps {
  children: ReactNode;
  className?: string;
}

export function ChipSet({ children, className }: ChipSetProps): React.ReactElement {
  return <md-chip-set className={className}>{children}</md-chip-set>;
}
