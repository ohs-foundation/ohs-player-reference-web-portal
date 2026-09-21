import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import * as Select from '@radix-ui/react-select';
import { useTranslation } from 'ohs-player-web-core';
import { cn } from '../../lib/cn';

const inputClass =
  'text-base text-text bg-surface border border-outline rounded-sm px-3 h-11 w-full outline-none ' +
  'transition-[border-color,box-shadow] duration-[120ms] ease-out ' +
  'not-disabled:hover:border-text-muted aria-invalid:border-error';

export interface FieldRootProps {
  title: ReactNode;
  instructions?: ReactNode;
  entryFormat?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  compact?: boolean;
  children: ReactNode;
}

export function Field({
  title,
  instructions,
  entryFormat,
  error,
  required,
  compact,
  children,
}: Readonly<FieldRootProps>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('font-semibold text-text', compact ? 'text-base' : 'text-lg')}>
        {title}
        {required ? (
          <span className="ml-1 text-error" aria-hidden="true">
            {t('fieldRequiredAsterisk')}
          </span>
        ) : null}
      </span>
      {required ? (
        <span className="text-sm text-text-muted">
          {instructions ? (
            <>
              {instructions}
              {t('fieldInstructionsRequiredJoiner')}
            </>
          ) : null}
          {t('fieldRequired')}
        </span>
      ) : instructions ? (
        <span className="text-sm text-text-muted">{instructions}</span>
      ) : null}
      {children}
      {error ? (
        <span className="inline-flex items-center gap-1 text-sm text-error" role="alert">
          <ErrorMark />
          {error}
        </span>
      ) : entryFormat ? (
        <span className="text-sm text-text-muted">{entryFormat}</span>
      ) : null}
    </div>
  );
}

function ErrorMark(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  instructions?: ReactNode;
  entryFormat?: ReactNode;
  error?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, instructions, entryFormat, error, required, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field title={<label htmlFor={inputId}>{label}</label>} instructions={instructions} entryFormat={entryFormat} error={error} required={required}>
      <input
        ref={ref}
        id={inputId}
        className={cn(inputClass, className)}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
});

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  label: ReactNode;
  instructions?: ReactNode;
  entryFormat?: ReactNode;
  error?: ReactNode;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, instructions, entryFormat, error, required, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field title={<label htmlFor={inputId}>{label}</label>} instructions={instructions} entryFormat={entryFormat} error={error} required={required}>
      <textarea
        ref={ref}
        id={inputId}
        className={cn(inputClass, 'h-auto min-h-24 resize-y p-3', className)}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
});

export interface SelectFieldOption {
  value: string;
  label: ReactNode;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> {
  label: ReactNode;
  instructions?: ReactNode;
  error?: ReactNode;
  options: readonly SelectFieldOption[];
  placeholder?: string;
  /** `form` = 44px stacked field; `pill` = 56px toolbar control matching `SearchField`. */
  variant?: 'form' | 'pill';
}

export const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(function SelectField(
  { label, instructions, error, required, id, options, placeholder, value, defaultValue, disabled, onChange, className, name, variant = 'form' },
  ref,
) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ph = placeholder ?? t('selectPlaceholder');
  const current = value === undefined || value === null ? '' : String(value);

  return (
    <Field title={<label htmlFor={inputId}>{label}</label>} instructions={instructions} error={error} required={required}>
      <Select.Root
        value={current}
        defaultValue={defaultValue !== undefined ? String(defaultValue) : undefined}
        disabled={disabled}
        name={name}
        onValueChange={(v) => {
          onChange?.({ target: { value: v, name: name ?? '' }, currentTarget: { value: v, name: name ?? '' } } as unknown as React.ChangeEvent<HTMLSelectElement>);
        }}
      >
        <Select.Trigger
          ref={ref}
          id={inputId}
          className={['ohs-select-trigger', variant === 'pill' ? 'ohs-select-trigger--pill' : '', error ? 'ohs-select-trigger--error' : '', className ?? ''].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
        >
          <Select.Value placeholder={ph} />
          <Select.Icon className="ohs-select-icon">
            <ChevronIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="ohs-select-content" position="popper">
            <Select.Viewport>
              {options.map((opt) => (
                <Select.Item key={opt.value} value={opt.value} className="ohs-select-item">
                  <Select.ItemText>
                    {typeof opt.label === 'string' || typeof opt.label === 'number' ? String(opt.label) : opt.value}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Field>
  );
});

function ChevronIcon(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
