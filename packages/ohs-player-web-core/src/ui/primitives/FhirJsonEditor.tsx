import { type ReactElement, useCallback, useState } from 'react';

/** Props for {@link FhirJsonEditor}. */
export interface FhirJsonEditorProps {
  /** Resource to edit. Seeds the draft **once** on mount — pass a `key` to re-seed for a new resource. */
  value: unknown;
  /** Field label — pass a translated string (e.g. "FHIR Resource (JSON)"). */
  label: string;
  /** Fires on every edit with the parsed resource, or `null` when the draft is invalid, plus the raw text. */
  onChange?: (parsed: unknown, text: string) => void;
  /** Fires whenever validity flips. */
  onValidityChange?: (valid: boolean) => void;
  /** Inline message when the JSON fails to parse — pass a translated string. */
  invalidJsonMessage: string;
  /** Inline message when `resourceType`/`id` was changed from the loaded resource — pass a translated string. */
  immutableFieldsMessage: string;
  /** Extra class on the root element. */
  className?: string;
}

interface ResourceIdentity {
  resourceType?: string;
  id?: string;
}

function identityOf(value: unknown): ResourceIdentity {
  if (value && typeof value === 'object') {
    const v = value as { resourceType?: unknown; id?: unknown };
    return {
      resourceType: typeof v.resourceType === 'string' ? v.resourceType : undefined,
      id: typeof v.id === 'string' ? v.id : undefined,
    };
  }
  return {};
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

const ERROR_ID = 'ohs-json-editor-error';

/**
 * Editable "FHIR Resource (JSON)" field with inline validation. Parses on every change and rejects
 * two ways: unparseable JSON, and any change to `resourceType`/`id` (which would turn an update into
 * a cross-type/cross-id write). Reports the parsed resource and validity through callbacks; the
 * consuming app owns i18n (labels/messages passed in), Save wiring, and PUT. Token-styled and
 * dark-mode-safe. Initializes the draft once on mount — pass a `key` to reset for a new resource.
 * @public
 */
export function FhirJsonEditor({
  value,
  label,
  onChange,
  onValidityChange,
  invalidJsonMessage,
  immutableFieldsMessage,
  className,
}: FhirJsonEditorProps): ReactElement {
  const [original] = useState<ResourceIdentity>(() => identityOf(value));
  const [text, setText] = useState<string>(() => safeStringify(value));
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (next: string) => {
      setText(next);
      let parsed: unknown;
      try {
        parsed = JSON.parse(next);
      } catch {
        setError(invalidJsonMessage);
        onValidityChange?.(false);
        onChange?.(null, next);
        return;
      }
      const nextIdentity = identityOf(parsed);
      if (
        nextIdentity.resourceType !== original.resourceType ||
        nextIdentity.id !== original.id
      ) {
        setError(immutableFieldsMessage);
        onValidityChange?.(false);
        onChange?.(null, next);
        return;
      }
      setError(null);
      onValidityChange?.(true);
      onChange?.(parsed, next);
    },
    [invalidJsonMessage, immutableFieldsMessage, original, onChange, onValidityChange],
  );

  return (
    <div className={className ? `ohs-json-editor ${className}` : 'ohs-json-editor'}>
      <label className="ohs-json-editor__label" htmlFor="ohs-json-editor-textarea">
        {label}
      </label>
      <textarea
        id="ohs-json-editor-textarea"
        className="ohs-json-editor__textarea"
        value={text}
        spellCheck={false}
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? ERROR_ID : undefined}
      />
      {error ? (
        <p id={ERROR_ID} className="ohs-json-editor__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
