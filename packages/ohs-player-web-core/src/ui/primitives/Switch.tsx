import { forwardRef, useCallback, useEffect, useId, useRef, type MutableRefObject, type Ref } from 'react';

type MdSwitchEl = HTMLElement & { selected: boolean; disabled: boolean };

function assignRef<T>(r: Ref<T | null> | undefined, value: T | null): void {
  if (r == null) return;
  if (typeof r === 'function') r(value);
  else (r as MutableRefObject<T | null>).current = value;
}

export interface SwitchProps {
  selected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export const Switch = forwardRef<MdSwitchEl, SwitchProps>(function Switch(
  { selected, defaultSelected, onChange, disabled, label, id },
  ref,
) {
  const generatedId = useId().replace(/:/g, '');
  const switchId = id ?? `ohs-sw-${generatedId}`;
  const hostRef = useRef<MdSwitchEl | null>(null);

  const mergedRef = useCallback(
    (node: MdSwitchEl | null) => {
      hostRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (selected !== undefined) el.selected = selected;
    el.disabled = Boolean(disabled);
  }, [selected, disabled]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (defaultSelected !== undefined && selected === undefined) el.selected = defaultSelected;
  }, [defaultSelected, selected]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !onChange) return;
    const handler = (): void => {
      onChange(el.selected);
    };
    el.addEventListener('change', handler);
    return (): void => {
      el.removeEventListener('change', handler);
    };
  }, [onChange]);

  const switchEl = <md-switch ref={mergedRef} id={switchId} />;

  if (label) {
    return (
      <div className="ohs-switch">
        {switchEl}
        <label htmlFor={switchId} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {label}
        </label>
      </div>
    );
  }

  return switchEl;
});
