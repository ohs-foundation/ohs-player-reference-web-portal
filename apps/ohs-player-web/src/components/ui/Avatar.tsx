export interface AvatarProps {
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

export function Avatar({ name, src, className }: Readonly<AvatarProps>): React.ReactElement {
  return (
    <span className={['ohs-avatar', className].filter(Boolean).join(' ')} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}
