import { type ReactNode, useId } from 'react';
import { RiArrowDownSLine, RiCloseLine, RiImageAddLine, type RemixiconComponentType } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { Button } from '../../components/ui';
import type { Option } from './userFormOptions';

/** Shared controls for the Add User / Edit User drawers (bespoke, token-styled per DESIGN.md). */

export function Section({
  icon: Icon,
  title,
  children,
}: Readonly<{ icon: RemixiconComponentType; title: string; children: ReactNode }>): React.ReactElement {
  return (
    <details className="ohs-detail-section" open>
      <summary className="ohs-detail-section__header">
        <span className="ohs-detail-section__title">
          <Icon size={20} />
          {title}
        </span>
        <RiArrowDownSLine size={20} className="ohs-detail-section__chevron" aria-hidden="true" />
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

export function StackedInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  full,
  error,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  full?: boolean;
  error?: string;
}>): React.ReactElement {
  const id = useId();
  return (
    <div className={fieldClass(full, error)}>
      <label className="ohs-formfield__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="ohs-formfield__input"
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
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
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
  placeholder: string;
  full?: boolean;
  error?: string;
}>): React.ReactElement {
  const id = useId();
  return (
    <div className={fieldClass(full, error)}>
      <label className="ohs-formfield__label" htmlFor={id}>
        {label}
      </label>
      <div className="ohs-formfield__selectwrap">
        <select
          id={id}
          className="ohs-formfield__select"
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RiArrowDownSLine size={20} className="ohs-formfield__chevron" aria-hidden="true" />
      </div>
      {error ? (
        <span className="ohs-formfield__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
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
  const id = useId();
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const available = options.filter((o) => !value.includes(o.value));
  return (
    <div className="ohs-formfield ohs-formfield--full">
      <label className="ohs-formfield__label" htmlFor={id}>
        {label}
      </label>
      {value.length > 0 ? (
        <div className="ohs-multiselect__chips">
          {value.map((v) => (
            <span className="ohs-multiselect__chip" key={v}>
              {labelFor(v)}
              <button
                type="button"
                className="ohs-multiselect__chip-remove"
                aria-label={t('removeAssignment')}
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                <RiCloseLine size={16} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="ohs-formfield__selectwrap">
        <select
          id={id}
          className="ohs-formfield__select"
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...value, e.target.value]);
          }}
        >
          <option value="">{placeholder}</option>
          {available.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RiArrowDownSLine size={20} className="ohs-formfield__chevron" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Avatar upload placeholder — disabled until the backend offers image storage (ticket follow-up). */
export function ImageUpload(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="ohs-image-upload">
      <span className="ohs-image-upload__placeholder">
        <RiImageAddLine size={24} aria-hidden="true" />
      </span>
      <div>
        <Button variant="outlined" size="sm" type="button" disabled>
          {t('uploadImage')}
        </Button>
        <p className="ohs-image-upload__helper">{t('uploadImageHelp')}</p>
      </div>
    </div>
  );
}
