import { forwardRef, type InputHTMLAttributes } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { cn } from '../../lib/cn';

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
  return (
    <div
      className={cn(
        'ohs-searchfield',
        'inline-flex items-center gap-4 w-[357px] max-w-full box-border px-6 rounded',
        'border border-outline bg-surface',
        size === 'lg' ? 'h-14' : 'h-12',
        className,
      )}
    >
      <RiSearchLine size={20} className="shrink-0 text-text-quaternary" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        className={cn(
          'flex-1 min-w-0 border-none bg-transparent font-body text-sm text-text',
          'placeholder:text-text-quaternary focus:outline-none focus:shadow-none',
        )}
        aria-label={label}
        {...rest}
      />
    </div>
  );
});
