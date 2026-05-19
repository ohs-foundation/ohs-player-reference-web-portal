import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

type MdOutlinedTextFieldEl = HTMLElement & {
  value: string;
  disabled: boolean;
  required: boolean;
  error: boolean;
  errorText: string;
  supportingText: string;
  label: string;
  type: string;
  rows: number;
  cols: number;
  noAsterisk: boolean;
  name: string;
  maxLength: number;
  minLength: number;
};

type MdOutlinedSelectEl = HTMLElement & {
  value: string;
  disabled: boolean;
  required: boolean;
  error: boolean;
  errorText: string;
  supportingText: string;
  label: string;
  name: string;
};

function assignRef<T>(r: Ref<T | null> | undefined, value: T | null): void {
  if (r == null) return;
  if (typeof r === 'function') r(value);
  else (r as MutableRefObject<T | null>).current = value;
}

function errorToString(error: ReactNode): string {
  if (error === null || error === undefined) return '';
  if (typeof error === 'string' || typeof error === 'number') return String(error);
  return '';
}

function entryFormatToString(entryFormat: ReactNode): string {
  if (entryFormat === null || entryFormat === undefined) return '';
  if (typeof entryFormat === 'string' || typeof entryFormat === 'number') return String(entryFormat);
  return '';
}

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
}: FieldRootProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="ohs-field">
      <span className="ohs-field__title" data-size={compact ? 'compact' : undefined}>
        {title}
        {required ? (
          <span className="ohs-field__required" aria-hidden="true">
            {t('fieldRequiredAsterisk')}
          </span>
        ) : null}
      </span>
      {required ? (
        <span className="ohs-field__instructions">
          {instructions ? (
            <>
              {instructions}
              {t('fieldInstructionsRequiredJoiner')}
            </>
          ) : null}
          {t('fieldRequired')}
        </span>
      ) : instructions ? (
        <span className="ohs-field__instructions">{instructions}</span>
      ) : null}
      {children}
      {error ? (
        <span className="ohs-field__error" role="alert">
          <ErrorMark />
          {error}
        </span>
      ) : entryFormat ? (
        <span className="ohs-field__entry-format">{entryFormat}</span>
      ) : null}
    </div>
  );
}

function ErrorMark(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export type FieldStyle = 'outlined' | 'filled';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  instructions?: ReactNode;
  entryFormat?: ReactNode;
  error?: ReactNode;
  fieldStyle?: FieldStyle;
}

export const TextField = forwardRef<MdOutlinedTextFieldEl, TextFieldProps>(function TextField(
  {
    label,
    instructions,
    entryFormat,
    error,
    required,
    id,
    value,
    defaultValue,
    disabled,
    name,
    onChange,
    onInput,
    className,
    type,
    maxLength,
    minLength,
    autoComplete,
    fieldStyle = 'outlined',
  },
  ref,
) {
  const generatedId = useId().replace(/:/g, '');
  const inputId = id ?? `ohs-tf-${generatedId}`;
  const hostRef = useRef<MdOutlinedTextFieldEl | null>(null);
  const mergedRef = useCallback(
    (node: MdOutlinedTextFieldEl | null) => {
      hostRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const mdLabel = '';
  const errStr = errorToString(error);
  const sup = error ? '' : entryFormatToString(entryFormat);
  const inputType = type ?? 'text';

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (value !== undefined) el.value = String(value);
    el.disabled = Boolean(disabled);
    el.required = Boolean(required);
    el.error = Boolean(error);
    el.errorText = errStr;
    el.supportingText = sup;
    el.label = mdLabel;
    el.noAsterisk = true;
    el.type = inputType;
    if (name !== undefined) el.name = name;
    if (maxLength !== undefined) el.maxLength = maxLength;
    if (minLength !== undefined) el.minLength = minLength;
    if (autoComplete !== undefined) el.setAttribute('autocomplete', autoComplete);
  }, [
    value,
    disabled,
    required,
    error,
    errStr,
    sup,
    mdLabel,
    inputType,
    name,
    maxLength,
    minLength,
    autoComplete,
  ]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (defaultValue !== undefined && value === undefined) el.value = String(defaultValue);
  }, [defaultValue, value]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onNativeInput = (ev: Event): void => {
      onInput?.(ev as unknown as React.FormEvent<HTMLInputElement>);
      const v = el.value;
      onChange?.({
        target: { value: v },
        currentTarget: { value: v },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    };
    el.addEventListener('input', onNativeInput);
    return (): void => {
      el.removeEventListener('input', onNativeInput);
    };
  }, [onChange, onInput]);

  const fieldProps = {
    ref: mergedRef,
    id: inputId,
    className,
    label: mdLabel,
    'supporting-text': sup,
    'error-text': errStr,
    error: Boolean(error),
    required: Boolean(required),
    disabled: Boolean(disabled),
    type: inputType,
  } as const;

  return (
    <Field title={<label htmlFor={inputId}>{label}</label>} instructions={instructions} entryFormat={entryFormat} error={error} required={required}>
      {fieldStyle === 'filled'
        ? <md-filled-text-field {...fieldProps} />
        : <md-outlined-text-field {...fieldProps} />}
    </Field>
  );
});

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  label: ReactNode;
  instructions?: ReactNode;
  entryFormat?: ReactNode;
  error?: ReactNode;
  fieldStyle?: FieldStyle;
}

export const TextAreaField = forwardRef<MdOutlinedTextFieldEl, TextAreaFieldProps>(
  function TextAreaField(
    {
      label,
      instructions,
      entryFormat,
      error,
      required,
      id,
      value,
      defaultValue,
      disabled,
      name,
      rows,
      cols,
      onChange,
      onInput,
      className,
      maxLength,
      minLength,
      autoComplete,
      fieldStyle = 'outlined',
    },
    ref,
  ) {
    const generatedId = useId().replace(/:/g, '');
    const inputId = id ?? `ohs-ta-${generatedId}`;
    const hostRef = useRef<MdOutlinedTextFieldEl | null>(null);
    const mergedRef = useCallback(
      (node: MdOutlinedTextFieldEl | null) => {
        hostRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    const mdLabel = '';
    const errStr = errorToString(error);
    const sup = error ? '' : entryFormatToString(entryFormat);

    useEffect(() => {
      const el = hostRef.current;
      if (!el) return;
      if (value !== undefined) el.value = String(value);
      el.disabled = Boolean(disabled);
      el.required = Boolean(required);
      el.error = Boolean(error);
      el.errorText = errStr;
      el.supportingText = sup;
      el.label = mdLabel;
      el.type = 'textarea';
      el.rows = rows ?? 4;
      el.cols = cols ?? 20;
      el.noAsterisk = true;
      if (name !== undefined) el.name = name;
      if (maxLength !== undefined) el.maxLength = maxLength;
      if (minLength !== undefined) el.minLength = minLength;
      if (autoComplete !== undefined) el.setAttribute('autocomplete', autoComplete);
    }, [
      value,
      disabled,
      required,
      error,
      errStr,
      sup,
      mdLabel,
      rows,
      cols,
      name,
      maxLength,
      minLength,
      autoComplete,
    ]);

    useEffect(() => {
      const el = hostRef.current;
      if (!el) return;
      if (defaultValue !== undefined && value === undefined) el.value = String(defaultValue);
    }, [defaultValue, value]);

    useEffect(() => {
      const el = hostRef.current;
      if (!el) return;
      const onNativeInput = (ev: Event): void => {
        onInput?.(ev as unknown as React.FormEvent<HTMLTextAreaElement>);
        const v = el.value;
        onChange?.({
          target: { value: v },
          currentTarget: { value: v },
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>);
      };
      el.addEventListener('input', onNativeInput);
      return (): void => {
        el.removeEventListener('input', onNativeInput);
      };
    }, [onChange, onInput]);

    const areaProps = {
      ref: mergedRef,
      id: inputId,
      className,
      label: mdLabel,
      'supporting-text': sup,
      'error-text': errStr,
      error: Boolean(error),
      required: Boolean(required),
      disabled: Boolean(disabled),
      type: 'textarea' as const,
      rows: rows ?? 4,
      cols: cols ?? 20,
    } as const;

    return (
      <Field title={<label htmlFor={inputId}>{label}</label>} instructions={instructions} entryFormat={entryFormat} error={error} required={required}>
        {fieldStyle === 'filled'
          ? <md-filled-text-field {...areaProps} />
          : <md-outlined-text-field {...areaProps} />}
      </Field>
    );
  },
);

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
  fieldStyle?: FieldStyle;
}

export const SelectField = forwardRef<MdOutlinedSelectEl, SelectFieldProps>(function SelectField(
  {
    label,
    instructions,
    error,
    required,
    id,
    options,
    placeholder,
    value,
    defaultValue,
    disabled,
    onChange,
    className,
    name,
    fieldStyle = 'outlined',
  },
  ref,
) {
  const { t } = useTranslation();
  const generatedId = useId().replace(/:/g, '');
  const inputId = id ?? `ohs-sel-${generatedId}`;
  const hostRef = useRef<MdOutlinedSelectEl | null>(null);
  const mergedRef = useCallback(
    (node: MdOutlinedSelectEl | null) => {
      hostRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const mdLabel = '';
  const errStr = errorToString(error);
  const sup = '';

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (value !== undefined) el.value = String(value);
    el.disabled = Boolean(disabled);
    el.required = Boolean(required);
    el.error = Boolean(error);
    el.errorText = errStr;
    el.supportingText = sup;
    el.label = mdLabel;
    if (name !== undefined) el.name = name;
  }, [value, disabled, required, error, errStr, sup, mdLabel, name]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (defaultValue !== undefined && value === undefined) el.value = String(defaultValue);
  }, [defaultValue, value]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onNativeChange = (): void => {
      const v = el.value;
      onChange?.({
        target: { value: v, name: name ?? '' },
        currentTarget: { value: v, name: name ?? '' },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    };
    el.addEventListener('change', onNativeChange);
    return (): void => {
      el.removeEventListener('change', onNativeChange);
    };
  }, [onChange, name]);

  const current = value === undefined || value === null ? '' : String(value);
  const ph = placeholder ?? t('selectPlaceholder');

  const selectOptions = (
    <>
      <md-select-option headline={ph} selected={current === ''} />
      {options.map((opt) => (
        <md-select-option
          key={opt.value}
          value={opt.value}
          headline={
            typeof opt.label === 'string' || typeof opt.label === 'number'
              ? String(opt.label)
              : opt.value
          }
          selected={current === opt.value}
        />
      ))}
    </>
  );

  const selectProps = {
    ref: mergedRef,
    id: inputId,
    className,
    label: mdLabel,
    'supporting-text': sup,
    'error-text': errStr,
    error: Boolean(error),
    required: Boolean(required),
    disabled: Boolean(disabled),
  } as const;

  return (
    <Field title={<label htmlFor={inputId}>{label}</label>} instructions={instructions} error={error} required={required}>
      {fieldStyle === 'filled'
        ? <md-filled-select {...selectProps}>{selectOptions}</md-filled-select>
        : <md-outlined-select {...selectProps}>{selectOptions}</md-outlined-select>}
    </Field>
  );
});
