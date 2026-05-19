import { forwardRef, useCallback, useEffect, useId, useRef, type MutableRefObject, type Ref } from 'react';

type MdCheckboxEl = HTMLElement & {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  name: string;
  value: string;
};

function assignRef<T>(r: Ref<T | null> | undefined, value: T | null): void {
  if (r == null) return;
  if (typeof r === 'function') r(value);
  else (r as MutableRefObject<T | null>).current = value;
}

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

export const Checkbox = forwardRef<MdCheckboxEl, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, indeterminate, onChange, disabled, label, id, name, value },
  ref,
) {
  const generatedId = useId().replace(/:/g, '');
  const inputId = id ?? `ohs-cb-${generatedId}`;
  const hostRef = useRef<MdCheckboxEl | null>(null);

  const mergedRef = useCallback(
    (node: MdCheckboxEl | null) => {
      hostRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (checked !== undefined) el.checked = checked;
    el.indeterminate = Boolean(indeterminate);
    el.disabled = Boolean(disabled);
    if (name !== undefined) el.name = name;
    if (value !== undefined) el.value = value;
  }, [checked, indeterminate, disabled, name, value]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (defaultChecked !== undefined && checked === undefined) el.checked = defaultChecked;
  }, [defaultChecked, checked]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !onChange) return;
    const handler = (): void => {
      onChange(el.checked);
    };
    el.addEventListener('change', handler);
    return (): void => {
      el.removeEventListener('change', handler);
    };
  }, [onChange]);

  const cbEl = <md-checkbox ref={mergedRef} id={inputId} aria-label={label && !label ? label : undefined} />;

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
