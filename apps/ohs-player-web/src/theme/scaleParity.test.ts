import { themeCss } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { sysTheme } from './sysTheme';

/**
 * Values the retired static scales held before they were replaced, recorded from commit 90962c2.
 * Sprint 2 renamed references only, so every pair must still be pixel-identical.
 */
const RETIRED_TYPE_SCALE: Record<string, string> = {
  '--ohs-sys-typescale-display-small-size': '40px',
  '--ohs-sys-typescale-display-small-line-height': '48px',
  '--ohs-sys-typescale-headline-medium-size': '24px',
  '--ohs-sys-typescale-headline-medium-line-height': '32px',
  '--ohs-sys-typescale-title-medium-size': '16px',
  '--ohs-sys-typescale-title-medium-line-height': '24px',
  '--ohs-sys-typescale-title-large-size': '20px',
  '--ohs-sys-typescale-title-large-line-height': '28px',
  '--ohs-sys-typescale-body-large-size': '16px',
  '--ohs-sys-typescale-body-large-line-height': '24px',
  '--ohs-sys-typescale-body-medium-size': '14px',
  '--ohs-sys-typescale-body-medium-line-height': '20px',
  '--ohs-sys-typescale-body-small-size': '12px',
  '--ohs-sys-typescale-body-small-line-height': '16px',
};

const RETIRED_SPACING: Record<string, string> = {
  '--ohs-sys-spacing-1': '4px',
  '--ohs-sys-spacing-2': '8px',
  '--ohs-sys-spacing-3': '12px',
  '--ohs-sys-spacing-4': '16px',
  '--ohs-sys-spacing-6': '24px',
  '--ohs-sys-spacing-8': '32px',
  '--ohs-sys-spacing-12': '48px',
  '--ohs-sys-spacing-16': '64px',
};

const SHAPE: Record<string, string> = {
  '--ohs-sys-shape-corner-extra-small': '4px',
  '--ohs-sys-shape-corner-small': '8px',
  '--ohs-sys-shape-corner-medium': '12px',
};

function emitted(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of themeCss(sysTheme).matchAll(/(--ohs-[a-z0-9-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

describe('scale parity', () => {
  it.each(Object.entries(RETIRED_TYPE_SCALE))('%s is still %s', (token, value) => {
    expect(emitted()[token]).toBe(value);
  });

  it.each(Object.entries(RETIRED_SPACING))('%s is still %s', (token, value) => {
    expect(emitted()[token]).toBe(value);
  });

  it.each(Object.entries(SHAPE))('%s is still %s', (token, value) => {
    expect(emitted()[token]).toBe(value);
  });

  it('keeps the legacy spacing steps the Tailwind scale does not cover', () => {
    const tokens = emitted();
    expect(tokens['--ohs-sys-spacing-5']).toBe('20px');
    expect(tokens['--ohs-sys-spacing-10']).toBe('40px');
    expect(tokens['--ohs-sys-spacing-20']).toBe('80px');
  });
});
