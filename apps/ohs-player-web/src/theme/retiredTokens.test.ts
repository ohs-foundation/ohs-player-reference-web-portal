import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Names removed during the M3 migration. Each maps to a sys token or a live legacy token; see
 * docs/THEMING.md §9. Referencing one again silently resolves to a `var()` fallback.
 */
const RETIRED = [
  '--ohs-spacing-unit',
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--ohs-spacing-${n}`),
  '--ohs-shadow-sm',
  '--ohs-shadow-md',
  '--ohs-shadow-lg',
  '--ohs-color-secondary',
  '--ohs-color-warning',
  '--ohs-color-info',
  '--ohs-color-surface-variant',
  '--ohs-color-surface-muted',
  '--ohs-color-surface-hover',
  '--ohs-color-positive',
  '--ohs-color-positive-surface',
  '--ohs-color-neutral-surface',
  '--ohs-color-outline',
  '--ohs-color-text-quaternary',
  '--ohs-color-focus',
  '--ohs-radius-md',
  '--ohs-font-heading-s-size',
  '--ohs-neutral-50',
  '--ohs-neutral-100',
  '--ohs-neutral-200',
  '--ohs-neutral-300',
  '--ohs-neutral-400',
  '--ohs-neutral-600',
  '--ohs-neutral-950',
  '--ohs-font-heading-xl-size',
  '--ohs-font-heading-m-size',
  '--ohs-font-heading-xs-size',
  '--ohs-font-text-xl-size',
  '--ohs-font-text-l-size',
  '--ohs-font-text-m-size',
  '--ohs-font-text-s-size',
];

const ROOTS = ['src', '../../packages/ohs-player-web-core/src'];
const EXTENSIONS = ['.ts', '.tsx', '.css'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!EXTENSIONS.some((ext) => path.endsWith(ext))) return [];
    if (/\.test\.tsx?$/.test(path)) return [];
    return [path];
  });
}

describe('retired tokens', () => {
  const files = ROOTS.flatMap(sourceFiles);

  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(RETIRED)('%s is not referenced anywhere', (token) => {
    // Word boundary so `--ohs-spacing-1` does not match `--ohs-spacing-16`.
    const pattern = new RegExp(`${token.replace(/[-]/g, '\\-')}(?![a-z0-9-])`);
    const offenders = files.filter((path) => pattern.test(readFileSync(path, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
