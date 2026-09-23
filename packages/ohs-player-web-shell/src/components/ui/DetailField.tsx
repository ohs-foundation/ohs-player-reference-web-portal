import { type ReactNode } from 'react';

export interface DetailFieldProps {
  label: string;
  /** The value; `null`, `undefined`, `false` or a blank string render as an em dash. */
  children?: ReactNode;
}

function isEmpty(value: ReactNode): boolean {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    (typeof value === 'string' && value.trim() === '')
  );
}

/** One label and value pair in a details drawer or panel; place several inside `.ohs-detail-grid`. */
export function DetailField({ label, children }: Readonly<DetailFieldProps>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{isEmpty(children) ? '—' : children}</span>
    </div>
  );
}
