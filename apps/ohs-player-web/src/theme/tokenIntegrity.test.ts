import { readFileSync } from 'node:fs';
import { applyTheme, defaultTheme, mergeTheme, themeCss } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { lightTheme } from './lightTheme';
import { sysTheme } from './sysTheme';

const STYLESHEETS = [
  'src/components/ui/theme.css',
  'src/index.css',
  'src/tailwind.css',
  '../../packages/ohs-player-web-core/src/styles.css',
];

function declaredNames(): Set<string> {
  const names = new Set<string>();

  for (const m of themeCss(sysTheme).matchAll(/(--ohs-[a-z0-9-]+)\s*:/g)) names.add(m[1]);

  const el = document.createElement('div');
  applyTheme(mergeTheme(defaultTheme, lightTheme), el);
  for (let i = 0; i < el.style.length; i += 1) names.add(el.style.item(i));

  for (const path of STYLESHEETS) {
    for (const m of readFileSync(path, 'utf8').matchAll(/(--ohs-[a-z0-9-]+)\s*:/g)) names.add(m[1]);
  }
  return names;
}

function references(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  for (const path of STYLESHEETS) {
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const m of line.matchAll(/var\((--ohs-[a-z0-9-]+)/g)) {
          if (!refs.has(m[1])) refs.set(m[1], []);
          refs.get(m[1])!.push(`${path}:${i + 1}`);
        }
      });
  }
  return refs;
}

/**
 * A `var(--ohs-x, fallback)` on a token nothing declares silently pins the fallback in both themes,
 * so a light-mode fallback survives into dark mode. The value looks fine; it just never applies.
 */
describe('token integrity', () => {
  it('every referenced --ohs-* token is declared somewhere', () => {
    const declared = declaredNames();
    const undeclared = [...references()]
      .filter(([name]) => !declared.has(name))
      .map(([name, sites]) => `${name} (${sites.join(', ')})`);

    expect(undeclared).toEqual([]);
  });

  it('declares enough tokens for the assertion above to be meaningful', () => {
    expect(declaredNames().size).toBeGreaterThan(150);
    expect(references().size).toBeGreaterThan(50);
  });
});
