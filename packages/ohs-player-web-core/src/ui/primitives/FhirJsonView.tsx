import { type ReactElement, useCallback, useState } from 'react';

/** Props for {@link FhirJsonView}. */
export interface FhirJsonViewProps {
  /** FHIR resource (or any JSON value) to pretty-print, read-only. */
  resource: unknown;
  /** Copy-button label — pass a translated string. */
  copyLabel: string;
  /** Copy-button label shown briefly after a successful copy. */
  copiedLabel: string;
  /** Called after the JSON is copied to the clipboard — use it to raise a status/toast. */
  onCopy?: () => void;
  /** Called if writing to the clipboard fails. */
  onCopyError?: (error: unknown) => void;
  /** Extra class on the root element. */
  className?: string;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Read-only, pretty-printed FHIR resource JSON with a Copy button. Token-styled (`--ohs-*`) and
 * dark-mode-safe. Labels are passed in (the consuming app owns i18n) and `onCopy`/`onCopyError`
 * let it raise status feedback — presentation only, no data fetching.
 * @public
 */
export function FhirJsonView({
  resource,
  copyLabel,
  copiedLabel,
  onCopy,
  onCopyError,
  className,
}: FhirJsonViewProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const text = safeStringify(resource);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), 2000);
      },
      (err: unknown) => onCopyError?.(err),
    );
  }, [text, onCopy, onCopyError]);

  return (
    <div className={className ? `ohs-json-view ${className}` : 'ohs-json-view'}>
      <div className="ohs-json-view__toolbar">
        <button
          type="button"
          className="ohs-json-view__copy"
          data-copied={copied ? 'true' : undefined}
          onClick={copy}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copied ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="ohs-json-view__code">
        <code>{text}</code>
      </pre>
    </div>
  );
}
