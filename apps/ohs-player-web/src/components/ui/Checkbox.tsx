import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { forwardRef, useId } from 'react';

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
      className="ohs-checkbox-root"
    >
      <RadixCheckbox.Indicator className="ohs-checkbox-indicator">
        <CheckIcon className="ohs-checkbox-check" />
        <span className="ohs-checkbox-dash" aria-hidden="true" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (label) {
    return (
      <div className="ohs-checkbox">
        {cbEl}
        <label htmlFor={inputId} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
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
