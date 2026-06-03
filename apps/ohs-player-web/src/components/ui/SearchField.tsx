import { forwardRef, type InputHTMLAttributes } from 'react';
import { RiSearchLine } from '@remixicon/react';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Accessible label (rendered as `aria-label`; the field has no visible label). */
  label: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, className, ...rest },
  ref,
) {
  return (
    <div className={['ohs-search-field', className].filter(Boolean).join(' ')}>
      <RiSearchLine size={20} className="ohs-search-field__icon" aria-hidden="true" />
      <input ref={ref} type="search" className="ohs-search-field__input" aria-label={label} {...rest} />
    </div>
  );
});
