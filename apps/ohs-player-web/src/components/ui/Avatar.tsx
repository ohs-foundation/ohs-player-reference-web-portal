import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const avatar = cva(
  'ohs-avatar inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill ' +
    'bg-surface-variant text-text-muted font-medium',
  {
    variants: {
      size: {
        sm: 'h-7 w-7 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-16 w-16 text-xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface AvatarProps extends VariantProps<typeof avatar> {
  /** Full name, used for the initials fallback and image alt text. */
  name: string;
  /** Optional photo URL; falls back to initials when absent or it fails to load. */
  src?: string;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ name, src, size, className }: Readonly<AvatarProps>): React.ReactElement {
  return (
    <span className={cn(avatar({ size }), className)} aria-hidden="true">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}
