import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'ohs-player-web-core';
import { cn } from '../../lib/cn';
import { IconArrowDropDown, IconCheck } from './icons';

export interface FilterChipOption {
  value: string;
  label: string;
}

export interface FilterChipProps {
  /** Filter dimension name — the chip label while nothing is applied. */
  label: string;
  /** Menu variant: the leading reset item ("All statuses"). Selecting it clears the chip. */
  allLabel?: string;
  options?: readonly FilterChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** `menu` opens an option listbox; `text` opens a free-text popover with Apply/Clear. */
  variant?: 'menu' | 'text';
  /** Text variant: helper line under the input. */
  hint?: string;
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  above: boolean;
}

const MAX_PANEL = 320;
const GAP = 4;
const EDGE = 8;

/** M3 filter chip used as a menu anchor: unselected it names the dimension, selected it shows the value. */
export function FilterChip({
  label,
  allLabel,
  options = [],
  value,
  onChange,
  disabled,
  variant = 'menu',
  hint,
}: Readonly<FilterChipProps>): React.ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const typeAhead = useRef({ term: '', at: 0 });
  const [rect, setRect] = useState<AnchorRect | null>(null);

  // The reset item leads the menu; committing it returns the chip to its unselected state.
  const items: readonly { value: string | null; label: string }[] =
    variant === 'menu' ? [{ value: null, label: allLabel ?? '' }, ...options] : [];

  const selectedLabel =
    value === null ? null : (options.find((o) => o.value === value)?.label ?? value);

  /* Portalled + fixed like Listbox: table toolbars clip overflow, so an in-flow panel is cut off. */
  const measure = useCallback(() => {
    const el = triggerRef.current;
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

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  // Second pass: the panel can be wider than the chip (min-width anchor), so pull it back from the
  // right viewport edge once its real width is known. The functional update returns the same object
  // when nothing changes, so re-running on `rect` settles instead of looping.
  useLayoutEffect(() => {
    if (!open) return;
    const width = panelRef.current?.getBoundingClientRect().width ?? 0;
    setRect((r) => {
      if (!r) return r;
      const overflow = r.left + width - (window.innerWidth - EDGE);
      return overflow > 0 ? { ...r, left: Math.max(EDGE, r.left - overflow) } : r;
    });
  }, [open, rect]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const reflow = () => measure();
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', reflow);
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

  const openPanel = () => {
    if (variant === 'menu') {
      const selected = items.findIndex((o) => o.value === value);
      setActive(selected >= 0 ? selected : 0);
    } else {
      setDraft(value ?? '');
    }
    setOpen(true);
  };

  const commit = (next: string | null) => {
    onChange(next);
    close();
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (variant !== 'menu') return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openPanel();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => (i - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (items[active]) commit(items[active].value);
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
        const hit = items.findIndex((o) => o.label.toLowerCase().startsWith(term.toLowerCase()));
        if (hit >= 0) setActive(hit);
      }
    }
  };

  const selected = value !== null;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="ohs-filter-chip ohs-state-layer"
      data-selected={selected || undefined}
      // Select-only combobox (APG): focus stays here, aria-activedescendant tracks the menu —
      // role button would make that attribute invalid.
      role={variant === 'menu' ? 'combobox' : undefined}
      aria-haspopup={variant === 'menu' ? 'listbox' : 'dialog'}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-activedescendant={
        variant === 'menu' && open && items[active] ? `${id}-opt-${active}` : undefined
      }
      aria-label={selected ? `${label}: ${selectedLabel ?? ''}` : label}
      title={selected ? (selectedLabel ?? undefined) : undefined}
      disabled={disabled}
      onClick={() => (open ? close(false) : openPanel())}
      onKeyDown={onTriggerKeyDown}
    >
      {selected ? (
        <IconCheck size={18} className="ohs-filter-chip__check" aria-hidden="true" />
      ) : null}
      <span className="ohs-filter-chip__label">{selected ? selectedLabel : label}</span>
      <IconArrowDropDown size={18} className="ohs-filter-chip__arrow" aria-hidden="true" />
    </button>
  );

  if (variant === 'text') {
    const apply = (e: React.FormEvent) => {
      e.preventDefault();
      commit(draft.trim() === '' ? null : draft.trim());
    };
    return (
      <>
        {trigger}
        {open && rect
          ? createPortal(
              <form
                ref={(el) => {
                  panelRef.current = el;
                }}
                id={panelId}
                role="dialog"
                aria-label={label}
                className="ohs-filter-chip__popover"
                style={popoverStyle(rect)}
                onSubmit={apply}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                  }
                }}
              >
                <label className="ohs-filter-chip__popover-label" htmlFor={`${id}-input`}>
                  {label}
                </label>
                <input
                  autoFocus
                  id={`${id}-input`}
                  type="text"
                  className="ohs-filter-chip__input"
                  value={draft}
                  aria-describedby={hint ? `${id}-hint` : undefined}
                  onChange={(e) => setDraft(e.target.value)}
                />
                {hint ? (
                  <span id={`${id}-hint`} className="ohs-filter-chip__hint">
                    {hint}
                  </span>
                ) : null}
                <span className="ohs-filter-chip__popover-actions">
                  <button
                    type="button"
                    className="ohs-filter-chip__popover-btn"
                    onClick={() => commit(null)}
                  >
                    {t('clear')}
                  </button>
                  <button
                    type="submit"
                    className="ohs-filter-chip__popover-btn ohs-filter-chip__popover-btn--primary"
                  >
                    {t('filterApply')}
                  </button>
                </span>
              </form>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <>
      {trigger}
      {open && rect
        ? createPortal(
            <ul
              ref={(el) => {
                panelRef.current = el;
              }}
              id={panelId}
              role="listbox"
              aria-label={label}
              className="ohs-filter-chip__panel"
              style={{
                top: rect.above ? undefined : rect.top,
                bottom: rect.above ? window.innerHeight - rect.top : undefined,
                left: rect.left,
                minWidth: rect.width,
                maxHeight: rect.maxHeight,
              }}
            >
              {items.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <li
                    key={o.value ?? ''}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    className="ohs-filter-chip__option"
                    data-active={i === active ? 'true' : undefined}
                    data-selected={isSelected ? 'true' : undefined}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(o.value)}
                  >
                    {o.label}
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}

function popoverStyle(rect: AnchorRect): React.CSSProperties {
  return {
    top: rect.above ? undefined : rect.top,
    bottom: rect.above ? window.innerHeight - rect.top : undefined,
    left: rect.left,
  };
}

export interface FilterChipBarProps {
  children: ReactNode;
  /** Right-align the bar inside its toolbar row (wraps left-aligned below 900px). */
  align?: 'start' | 'end';
  /** Rendered trailing text button — visible only while at least one chip is selected. */
  onClearAll?: () => void;
  clearVisible?: boolean;
  className?: string;
}

export function FilterChipBar({
  children,
  align = 'start',
  onClearAll,
  clearVisible,
  className,
}: Readonly<FilterChipBarProps>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('filtersGroupLabel')}
      className={cn('ohs-filter-chipbar', align === 'end' && 'ohs-filter-chipbar--end', className)}
    >
      {children}
      {clearVisible && onClearAll ? (
        <button type="button" className="ohs-filter-chipbar__clear" onClick={onClearAll}>
          {t('filterClearAll')}
        </button>
      ) : null}
    </div>
  );
}
