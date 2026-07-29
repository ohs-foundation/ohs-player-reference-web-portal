import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'ohs-player-web-core';
import { IconCheck, IconChevronDown } from './icons';

export interface ListboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ListboxProps {
  label: ReactNode;
  /** Selected values. A single-select passes at most one. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  options: readonly ListboxOption[];
  placeholder: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: ReactNode;
  /** Mirrored onto a hidden native control so form submission and validation keep working. */
  name?: string;
  /** Rendered under the field — the chip row for a multi-select. */
  children?: ReactNode;
  className?: string;
  /** 40px pill with no notched label — for in-table controls like items-per-page. */
  compact?: boolean;
}

function nextIndex(from: number, delta: number, options: readonly ListboxOption[]): number {
  const total = options.length;
  for (let step = 1; step <= total; step += 1) {
    const i = (from + delta * step + total * total) % total;
    if (!options[i]?.disabled) return i;
  }
  return from;
}

/**
 * Outlined field that opens a themed option panel. Replaces the native `<select>`, whose option list
 * the OS renders and no stylesheet can reach.
 */
export function Listbox({
  label,
  value,
  onChange,
  options,
  placeholder,
  multiple,
  disabled,
  required,
  error,
  name,
  children,
  className,
  compact,
}: Readonly<ListboxProps>): React.ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeAhead = useRef({ term: '', at: 0 });
  const [rect, setRect] = useState<{ top: number; left: number; width: number; maxHeight: number; above: boolean } | null>(null);

  const MAX_PANEL = 320;
  const GAP = 4;

  /* Fixed-positioned in a portal: the field sits inside three clipping ancestors (the section card's
     overflow:hidden, the drawer shell, and the scrolling drawer body), so an in-flow panel is cut off. */
  const measure = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - GAP;
    const flip = below < Math.min(MAX_PANEL, 160) && above > below;
    setRect({
      top: flip ? r.top - GAP : r.bottom + GAP,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(96, Math.min(MAX_PANEL, flip ? above : below)),
      above: flip,
    });
  }, []);

  const selectedLabels = useMemo(
    () => value.map((v) => options.find((o) => o.value === v)?.label ?? v),
    [value, options],
  );

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const reflow = () => measure();
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', reflow);
    // Capture phase so the drawer body's own scroll reaches this too.
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open, measure]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const commit = (option: ListboxOption) => {
    if (option.disabled) return;
    if (multiple) {
      onChange(
        value.includes(option.value)
          ? value.filter((v) => v !== option.value)
          : [...value, option.value],
      );
      return;
    }
    onChange([option.value]);
    close();
  };

  const openAt = () => {
    const firstSelected = options.findIndex((o) => value.includes(o.value));
    setActive(firstSelected >= 0 ? firstSelected : 0);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openAt();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => nextIndex(i, 1, options));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => nextIndex(i, -1, options));
        break;
      case 'Home':
        e.preventDefault();
        setActive(nextIndex(-1, 1, options));
        break;
      case 'End':
        e.preventDefault();
        setActive(nextIndex(options.length, -1, options));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options[active]) commit(options[active]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default: {
        if (e.key.length !== 1) break;
        const now = Date.now();
        const term = now - typeAhead.current.at > 800 ? e.key : typeAhead.current.term + e.key;
        typeAhead.current = { term, at: now };
        const hit = options.findIndex(
          (o) => !o.disabled && o.label.toLowerCase().startsWith(term.toLowerCase()),
        );
        if (hit >= 0) setActive(hit);
      }
    }
  };

  const summary = selectedLabels.length > 0 && !multiple ? selectedLabels[0] : placeholder;

  return (
    <div className={className}>
      <div
        ref={rootRef}
        className={[
          'ohs-formfield',
          'ohs-listbox',
          compact ? 'ohs-listbox--compact' : '',
          error ? 'ohs-formfield--error' : '',
          disabled ? 'ohs-formfield--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={compact ? 'ohs-listbox__a11y-label' : 'ohs-formfield__label'}
          id={`${id}-label`}
        >
          {label}
          {required ? (
            <span className="ohs-formfield__required" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </span>

        <button
          ref={triggerRef}
          type="button"
          id={id}
          role="combobox"
          className="ohs-formfield__content ohs-listbox__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${id}-label ${id}`}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          disabled={disabled}
          onClick={() => (open ? close(false) : openAt())}
          onKeyDown={onKeyDown}
        >
          <span className={selectedLabels.length > 0 && !multiple ? undefined : 'ohs-listbox__placeholder'}>
            {summary}
          </span>
        </button>

        <button
          type="button"
          className="ohs-formfield__trailing"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => (open ? close() : openAt())}
        >
          <IconChevronDown size={compact ? 20 : 24} />
        </button>

        {open && rect
          ? createPortal(
          <ul
            ref={panelRef}
            className="ohs-listbox__panel"
            data-above={rect.above ? 'true' : undefined}
            style={{
              top: rect.above ? undefined : rect.top,
              bottom: rect.above ? window.innerHeight - rect.top : undefined,
              left: rect.left,
              width: rect.width,
              maxHeight: rect.maxHeight,
            }}
            id={listId}
            role="listbox"
            aria-labelledby={`${id}-label`}
            aria-multiselectable={multiple || undefined}
          >
            {options.length === 0 ? (
              <li className="ohs-listbox__empty" role="presentation">
                {t('comboboxNoResults')}
              </li>
            ) : (
              options.map((o, i) => {
                const selected = value.includes(o.value);
                return (
                  <li
                    key={o.value}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={o.disabled || undefined}
                    className="ohs-listbox__option"
                    data-active={i === active ? 'true' : undefined}
                    data-selected={selected ? 'true' : undefined}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(o)}
                  >
                    {multiple ? (
                      <span className="ohs-listbox__check" aria-hidden="true">
                        {selected ? <IconCheck size={14} /> : null}
                      </span>
                    ) : null}
                    <span className="ohs-listbox__option-label">{o.label}</span>
                    {selected && !multiple ? <IconCheck size={20} aria-hidden="true" /> : null}
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
            )
          : null}

        {error ? (
          <span className="ohs-formfield__error" role="alert">
            {error}
          </span>
        ) : null}

        <select
          name={name}
          value={multiple ? [...value] : (value[0] ?? '')}
          multiple={multiple}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="ohs-listbox__native"
          onChange={() => undefined}
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {children}
    </div>
  );
}
