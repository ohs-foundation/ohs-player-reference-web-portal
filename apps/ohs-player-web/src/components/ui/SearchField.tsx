import { forwardRef, type InputHTMLAttributes } from 'react';
import { RiSearchLine } from '@remixicon/react';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Accessible label (rendered as `aria-label`; the field has no visible label). */
  label: string;
  /** `md` = 48px (in-table); `lg` = 56px (header). */
  size?: 'md' | 'lg';
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, size = 'md', className, ...rest },
  ref,
) {
  const cls = ['ohs-search-field', size === 'lg' ? 'ohs-search-field--lg' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      <RiSearchLine size={20} className="ohs-search-field__icon" aria-hidden="true" />
      <input ref={ref} type="search" className="ohs-search-field__input" aria-label={label} {...rest} />
    </div>
  );
});
