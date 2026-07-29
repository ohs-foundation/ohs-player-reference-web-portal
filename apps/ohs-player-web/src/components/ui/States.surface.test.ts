import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync('src/components/ui/theme.css', 'utf8');

function ruleBody(selector: string): string {
  const start = CSS.indexOf(selector);
  expect(start, `${selector} not found in theme.css`).toBeGreaterThan(-1);
  const open = CSS.indexOf('{', start);
  return CSS.slice(open + 1, CSS.indexOf('}', open));
}

/**
 * Empty/error states always render inside a card, table, drawer or panel. Painting their own
 * surface made them a lighter inset rectangle in dark mode, where the host card paints
 * `--ohs-sys-color-surface` (#0D0D0D) but this rule painted `--ohs-color-surface` (#1A1A1A).
 */
describe('empty and error states', () => {
  const body = ruleBody('.ohs-empty,\n.ohs-error-state');

  it('does not paint its own surface', () => {
    expect(body).toMatch(/background:\s*transparent/);
  });

  it('never resolves its background from a surface token', () => {
    expect(body).not.toMatch(/background:[^;]*--ohs-(sys-)?color-surface/);
  });
});
