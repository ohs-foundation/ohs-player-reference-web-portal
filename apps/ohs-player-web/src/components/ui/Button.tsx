import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'elevated' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

// `ohs-button` keeps the marker class so external selectors still match (e.g. the drawer-footer height override).
const button = cva(
  'ohs-button inline-flex items-center justify-center gap-2 rounded border border-transparent ' +
    'h-12 px-6 font-medium whitespace-nowrap cursor-pointer select-none no-underline ' +
    'transition-[background-color,border-color,color,filter] duration-[120ms] ease-out ' +
    'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)] ' +
    'aria-busy:cursor-progress disabled:opacity-55 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-contrast not-disabled:hover:bg-primary-hover',
        secondary:
          'bg-transparent border-border-tertiary text-text-muted not-disabled:hover:bg-surface-variant',
        outlined:
          'bg-transparent border-border-tertiary text-text-muted not-disabled:hover:bg-surface-variant',
        ghost: 'bg-transparent text-text border-border not-disabled:hover:bg-surface-variant',
        danger: 'bg-error text-primary-contrast not-disabled:hover:brightness-[0.92]',
        // M3-elevated: previously unstyled (rendered as base). Now a surface + low elevation.
        elevated: 'bg-surface text-text shadow-sm not-disabled:hover:bg-surface-variant',
      },
      size: {
        md: 'text-base/6',
        sm: 'h-9 px-4 text-sm/5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    VariantProps<typeof button> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, iconLeft, iconRight, children, className, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  label: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'ohs-icon-button inline-flex items-center justify-center h-9 w-9 rounded-pill ' +
          'bg-transparent border border-transparent text-text cursor-pointer hover:bg-background',
        className,
      )}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
});
