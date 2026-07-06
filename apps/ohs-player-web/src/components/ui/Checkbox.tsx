import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Visible text label rendered beside the box. */
  label?: string;
  /** Accessible name when there is no visible label (e.g. table select columns). */
  ariaLabel?: string;
  id?: string;
  name?: string;
  value?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, indeterminate, onChange, disabled, label, ariaLabel, id, name, value },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const checkedState = indeterminate ? ('indeterminate' as const) : checked;

  const cbEl = (
    <RadixCheckbox.Root
      ref={ref}
      id={inputId}
      checked={checkedState}
      defaultChecked={defaultChecked}
      onCheckedChange={(state) => onChange?.(state === true)}
      disabled={disabled}
      name={name}
      value={value}
      aria-label={label ? undefined : ariaLabel}
      className={cn(
        'group inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center p-0',
        'rounded-[4px] border border-border-tertiary bg-surface text-primary-contrast cursor-pointer',
        'transition-[background-color,border-color] duration-[120ms] ease-out',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]',
        'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
        'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <RadixCheckbox.Indicator className="inline-flex items-center justify-center text-primary-contrast">
        <CheckIcon className="hidden group-data-[state=checked]:block" />
        <span
          className="hidden h-0.5 w-2 rounded-[1px] bg-current group-data-[state=indeterminate]:block"
          aria-hidden="true"
        />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (label) {
    return (
      <div className="inline-flex items-center gap-2">
        {cbEl}
        <label htmlFor={inputId} className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
          {label}
        </label>
      </div>
    );
  }
  return cbEl;
});

function CheckIcon({ className }: Readonly<{ className?: string }>): React.ReactElement {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1.5 5 4 7.5 8.5 2.5" />
    </svg>
  );
}
