import { describe, expect, it } from 'vitest';
import { sysColorSchemes, type SysColorRole } from './sysTokens';

function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => Number.parseInt(hex.replace('#', '').slice(i, i + 2), 16));
  const [r, g, b] = channels.map((raw) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TEXT_PAIRS: Array<[SysColorRole, SysColorRole]> = [
  ['on-primary', 'primary'],
  ['on-primary-container', 'primary-container'],
  ['on-secondary', 'secondary'],
  ['on-secondary-container', 'secondary-container'],
  ['on-tertiary', 'tertiary'],
  ['on-error', 'error'],
  ['on-error-container', 'error-container'],
  ['on-surface', 'surface'],
  ['on-surface', 'surface-container-lowest'],
  ['on-surface', 'surface-container-low'],
  ['on-surface', 'surface-container'],
  ['on-surface', 'surface-container-high'],
  ['on-surface', 'surface-container-highest'],
  ['on-surface', 'surface-dim'],
  ['on-surface', 'surface-bright'],
  ['on-surface-variant', 'surface'],
  ['on-surface-variant', 'surface-container'],
  ['on-surface-variant', 'surface-container-highest'],
  ['on-success-container', 'success-container'],
  ['on-warning-container', 'warning-container'],
  ['on-info-container', 'info-container'],
  ['success', 'surface'],
  ['warning', 'surface'],
  ['info', 'surface'],
  ['error', 'surface'],
  ['inverse-on-surface', 'inverse-surface'],
];

const BOUNDARY_PAIRS: Array<[SysColorRole, SysColorRole]> = [
  ['outline', 'surface'],
  ['outline', 'surface-container'],
  ['outline', 'surface-container-highest'],
];

describe.each(['light', 'dark'] as const)('%s sys scheme', (mode) => {
  const scheme = sysColorSchemes[mode];

  it.each(TEXT_PAIRS)('%s on %s meets 4.5:1', (fg, bg) => {
    expect(contrast(scheme[fg], scheme[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BOUNDARY_PAIRS)('%s on %s meets 3:1', (fg, bg) => {
    expect(contrast(scheme[fg], scheme[bg])).toBeGreaterThanOrEqual(3);
  });
});
