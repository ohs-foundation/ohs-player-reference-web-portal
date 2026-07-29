import { forwardRef, type InputHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { IconSearch } from './icons';
import { cn } from '../../lib/cn';

const searchField = cva(
  'ohs-searchfield inline-flex items-center gap-4 w-[360px] max-w-full box-border ' +
    'h-14 px-6 rounded-pill border-[0.5px] bg-surface',
  {
    variants: {
      variant: {
        page: 'border-border-tertiary',
        global: 'max-w-[720px] border-border-secondary',
      },
    },
    defaultVariants: { variant: 'page' },
  },
);

export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Accessible label (rendered as `aria-label`; the field has no visible label). */
  label: string;
  /** `page` = in-page search; `global` = the top-nav search, which may stretch to 720px. */
  variant?: 'page' | 'global';
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, variant = 'page', className, ...rest },
  ref,
) {
  return (
    <div className={cn(searchField({ variant }), className)}>
      <IconSearch size={20} className="shrink-0 text-text-muted" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        className={cn(
          'flex-1 min-w-0 border-none bg-transparent font-body text-sm text-text',
          'placeholder:text-text-muted focus:outline-none focus:shadow-none',
        )}
        aria-label={label}
        {...rest}
      />
    </div>
  );
});
