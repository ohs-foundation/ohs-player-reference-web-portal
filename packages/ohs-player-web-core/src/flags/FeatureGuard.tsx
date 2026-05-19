import type { ReactNode } from 'react';
import { useFlag } from './FlagsProvider';

export function FeatureGuard({
  flag,
  children,
  fallback,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const on = useFlag(flag);
  if (on) return children;
  return fallback ?? null;
}
