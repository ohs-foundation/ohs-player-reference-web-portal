import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { forwardRef, useId } from 'react';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  name?: string;
  value?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, indeterminate, onChange, disabled, label, id, name, value },
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
      className="ohs-checkbox-root"
    >
      <RadixCheckbox.Indicator className="ohs-checkbox-indicator">
        <CheckIcon />
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

function CheckIcon(): React.ReactElement {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1.5 5 4 7.5 8.5 2.5" />
    </svg>
  );
}
