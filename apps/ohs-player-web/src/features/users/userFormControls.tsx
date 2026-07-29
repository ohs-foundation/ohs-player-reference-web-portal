import { type ReactNode, useId, useRef } from 'react';
import { IconChevronDown, IconClose, IconToday, type IconComponent } from '../../components/ui/icons';
import { Listbox } from '../../components/ui/Listbox';
import { useTranslation } from 'ohs-player-web-core';
import type { Option } from './userFormOptions';

/** Shared controls for the Add User / Edit User drawers (bespoke, token-styled per DESIGN.md). */

/** `icon` is accepted but not rendered — Figma's section header is title-only. */
export function Section({
  title,
  children,
}: Readonly<{ icon?: IconComponent; title: string; children: ReactNode }>): React.ReactElement {
  return (
    <details className="ohs-detail-section" open>
      <summary className="ohs-detail-section__header">
        <span className="ohs-detail-section__title">{title}</span>
        <IconChevronDown size={24} className="ohs-detail-section__chevron" aria-hidden="true" />
      </summary>
      <div className="ohs-detail-section__body">{children}</div>
    </details>
  );
}

function fieldClass(full?: boolean, error?: string): string {
  return ['ohs-formfield', full ? 'ohs-formfield--full' : '', error ? 'ohs-formfield--error' : '']
    .filter(Boolean)
    .join(' ');
}

function RequiredMark(): React.ReactElement {
  return (
    <span className="ohs-formfield__required" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function StackedInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  full,
  error,
  required,
  max,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  full?: boolean;
  error?: string;
  required?: boolean;
  /** Native upper bound (e.g. today's date on a `type="date"` field). */
  max?: string;
}>): React.ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={fieldClass(full, error)}>
      <label className="ohs-formfield__label" htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      <span className="ohs-formfield__content">
        <input
          ref={inputRef}
          id={id}
          className="ohs-formfield__input"
          type={type}
          value={value}
          placeholder={placeholder}
          max={max}
          aria-invalid={error ? true : undefined}
          aria-required={required ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {type === 'date' ? (
        <button
          type="button"
          className="ohs-formfield__trailing"
          aria-label={t('openDatePicker')}
          onClick={() => inputRef.current?.showPicker?.()}
        >
          <IconToday size={24} />
        </button>
      ) : null}
      {error ? (
        <span className="ohs-formfield__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function StackedTextArea({
  label,
  value,
  onChange,
  placeholder,
  full,
  error,
  required,
  rows = 3,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
  error?: string;
  required?: boolean;
  rows?: number;
}>): React.ReactElement {
  const id = useId();
  return (
    <div className={`${fieldClass(full, error)} ohs-formfield--multiline`}>
      <label className="ohs-formfield__label" htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      <span className="ohs-formfield__content">
        <textarea
          id={id}
          className="ohs-formfield__input ohs-formfield__textarea"
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-required={required ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {error ? (
        <span className="ohs-formfield__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function StackedSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  full,
  error,
  disabled,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
  placeholder: string;
  full?: boolean;
  error?: string;
  disabled?: boolean;
}>): React.ReactElement {
  return (
    <Listbox
      className={full ? 'ohs-formfield-slot--full' : undefined}
      label={label}
      value={value ? [value] : []}
      onChange={(next) => onChange(next[0] ?? '')}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
    />
  );
}

export function RadioRow({
  label,
  name,
  value,
  onChange,
  options,
}: Readonly<{
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
}>): React.ReactElement {
  return (
    <div className="ohs-radio-group">
      <span className="ohs-radio-group__label">{label}</span>
      <div className="ohs-radio-group__options">
        {options.map((o) => (
          <label className="ohs-radio" key={o.value}>
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: Readonly<{
  label: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}>): React.ReactElement {
  const { t } = useTranslation();
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <Listbox
      className="ohs-formfield-slot--full"
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      multiple
    >
      {value.length > 0 ? (
        <div className="ohs-multiselect__chips">
          {value.map((v) => (
            <span className="ohs-multiselect__chip" key={v}>
              {labelFor(v)}
              <button
                type="button"
                className="ohs-multiselect__chip-remove"
                aria-label={`${t('removeAssignment')} ${labelFor(v)}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                <IconClose size={18} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </Listbox>
  );
}
