import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { RiArrowDownSLine, RiCloseLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { filterComboboxOptions, type ComboboxOption } from './comboboxFilter';

export type { ComboboxOption };

export interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  full?: boolean;
  /** Max options rendered in the open list (default 80). Extra matches need a narrower query. */
  maxVisible?: number;
  id?: string;
}

function fieldClass(full?: boolean, error?: string): string {
  return ['ohs-formfield', full ? 'ohs-formfield--full' : '', error ? 'ohs-formfield--error' : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * Searchable single-select for large option sets (thousands of Locations, etc.).
 * Filters client-side and caps the open list so the DOM stays light.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  full,
  maxVisible = 80,
  id: idProp,
}: Readonly<ComboboxProps>): React.ReactElement {
  const { t } = useTranslation();
  const reactId = useId();
  const inputId = idProp ?? reactId;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => filterComboboxOptions(options, query), [options, query]);
  const visible = filtered.slice(0, maxVisible);
  const truncated = filtered.length > maxVisible;

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setHighlight(0);
  }, [disabled]);

  const closeList = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlight(0);
  }, []);

  const pick = useCallback(
    (next: string) => {
      onChange(next);
      closeList();
    },
    [onChange, closeList],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeList();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, closeList]);

  // Keep the highlighted option in view when navigating with the keyboard.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open, visible.length]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, visible.length - 1)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setHighlight(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlight(Math.max(0, visible.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (visible[highlight]) pick(visible[highlight].value);
        break;
      case 'Escape':
        e.preventDefault();
        closeList();
        break;
      default:
        break;
    }
  };

  const display = open ? query : (selected?.label ?? '');
  const ph = placeholder ?? t('selectPlaceholder');
  const activeId = open && visible[highlight] ? `${listboxId}-opt-${highlight}` : undefined;

  return (
    <div className={fieldClass(full, error)} ref={rootRef}>
      <label className="ohs-formfield__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="ohs-combobox__control">
        <input
          id={inputId}
          className="ohs-formfield__input ohs-combobox__input"
          role="combobox"
          type="text"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          placeholder={selected && !open ? selected.label : ph}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={openList}
          onKeyDown={onKeyDown}
        />
        {value && !disabled ? (
          <button
            type="button"
            className="ohs-combobox__clear"
            aria-label={t('clear')}
            tabIndex={-1}
            onClick={() => {
              onChange('');
              setQuery('');
              setOpen(true);
            }}
          >
            <RiCloseLine size={16} />
          </button>
        ) : null}
        <RiArrowDownSLine size={20} className="ohs-formfield__chevron" aria-hidden="true" />
      </div>
      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="ohs-combobox__list"
          aria-label={label}
        >
          {visible.length === 0 ? (
            <li className="ohs-combobox__empty" role="presentation">
              {t('comboboxNoMatches')}
            </li>
          ) : (
            visible.map((opt, i) => (
              <li
                key={opt.value}
                id={`${listboxId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={opt.value === value || i === highlight}
                className={[
                  'ohs-combobox__option',
                  i === highlight ? 'ohs-combobox__option--active' : '',
                  opt.value === value ? 'ohs-combobox__option--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  // Prevent input blur before click registers.
                  e.preventDefault();
                  pick(opt.value);
                }}
              >
                {opt.label}
              </li>
            ))
          )}
          {truncated ? (
            <li className="ohs-combobox__hint" role="presentation">
              {t('comboboxShowingLimited', { shown: maxVisible, total: filtered.length })}
            </li>
          ) : null}
        </ul>
      ) : null}
      {error ? (
        <span className="ohs-formfield__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
