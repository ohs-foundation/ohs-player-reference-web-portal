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
  '--ohs-sys-shape-corner-extra-large-decreased': '24px',
  '--ohs-sys-shape-corner-extra-large': '28px',
};

/** Figma type ramp steps M3 has no role for. */
const ADDED_TYPE_SCALE: Record<string, string> = {
  '--ohs-sys-typescale-heading-5xl-size': '72px',
  '--ohs-sys-typescale-heading-5xl-line-height': '80px',
  '--ohs-sys-typescale-heading-4xl-size': '64px',
  '--ohs-sys-typescale-heading-4xl-line-height': '72px',
  '--ohs-sys-typescale-heading-3xl-size': '56px',
  '--ohs-sys-typescale-heading-3xl-line-height': '64px',
  '--ohs-sys-typescale-heading-2xl-size': '48px',
  '--ohs-sys-typescale-heading-2xl-line-height': '64px',
  '--ohs-sys-typescale-heading-l-size': '32px',
  '--ohs-sys-typescale-heading-l-line-height': '40px',
  '--ohs-sys-typescale-text-xl-size': '20px',
  '--ohs-sys-typescale-text-xl-line-height': '28px',
  '--ohs-sys-typescale-text-xs-size': '10px',
  '--ohs-sys-typescale-text-xs-line-height': '14px',
  '--ohs-sys-typescale-text-2xs-size': '8px',
  '--ohs-sys-typescale-text-2xs-line-height': '12px',
};

/** Tracking tightens as the step grows: -1.5px at ≥48px, -1px at 32-40px, -0.5px below. */
const TRACKING: Record<string, string> = {
  '--ohs-sys-typescale-heading-5xl-letter-spacing': '-1.5px',
  '--ohs-sys-typescale-heading-2xl-letter-spacing': '-1.5px',
  '--ohs-sys-typescale-display-small-letter-spacing': '-1px',
  '--ohs-sys-typescale-heading-l-letter-spacing': '-1px',
  '--ohs-sys-typescale-headline-medium-letter-spacing': '-0.5px',
  '--ohs-sys-typescale-body-medium-letter-spacing': '-0.5px',
  '--ohs-sys-typescale-text-2xs-letter-spacing': '-0.5px',
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

  it.each(Object.entries(ADDED_TYPE_SCALE))('%s is %s', (token, value) => {
    expect(emitted()[token]).toBe(value);
  });

  it.each(Object.entries(TRACKING))('%s is %s', (token, value) => {
    expect(emitted()[token]).toBe(value);
  });

  it('keeps the legacy spacing steps the Tailwind scale does not cover', () => {
    const tokens = emitted();
    expect(tokens['--ohs-sys-spacing-5']).toBe('20px');
    expect(tokens['--ohs-sys-spacing-10']).toBe('40px');
    expect(tokens['--ohs-sys-spacing-14']).toBe('56px');
    expect(tokens['--ohs-sys-spacing-20']).toBe('80px');
  });
});
