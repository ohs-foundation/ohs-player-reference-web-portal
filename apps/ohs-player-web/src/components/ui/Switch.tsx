import * as RadixSwitch from '@radix-ui/react-switch';
import { forwardRef, useId } from 'react';

export interface SwitchProps {
  selected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { selected, defaultSelected, onChange, disabled, label, id },
  ref,
) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  const swEl = (
    <RadixSwitch.Root
      ref={ref}
      id={switchId}
      checked={selected}
      defaultChecked={defaultSelected}
      onCheckedChange={onChange}
      disabled={disabled}
      className="ohs-switch-root"
    >
      <RadixSwitch.Thumb className="ohs-switch-thumb" />
    </RadixSwitch.Root>
  );

  if (label) {
    return (
      <div className="ohs-switch">
        {swEl}
        <label htmlFor={switchId} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {label}
        </label>
      </div>
    );
  }
  return swEl;
});
