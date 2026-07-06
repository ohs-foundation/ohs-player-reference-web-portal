import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind conflict resolution: later utilities win, so a consumer-supplied
 * `className` correctly overrides a component's default variant classes (e.g. `bg-error` beats `bg-primary`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
