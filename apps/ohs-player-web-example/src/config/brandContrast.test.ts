import { readFileSync } from 'node:fs';
import { themeCss, type ThemeConfigV2 } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { portalDefaults } from './platform';

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function lightRole(css: string, role: string): string {
  const light = css.split("[data-theme='dark']")[0];
  const match = new RegExp(`--ohs-sys-color-${role}:\\s*(#[0-9a-fA-F]{6})`).exec(light);
  if (!match) throw new Error(`no light ${role}`);
  return match[1];
}

describe('the example brand', () => {
  it('keeps the active sidebar label readable on its fill', () => {
    const document = JSON.parse(readFileSync('public/portal-config.json', 'utf8')) as {
      brand: Pick<ThemeConfigV2, 'overrides' | 'darkOverrides'>;
    };
    const css = themeCss({ ...portalDefaults.theme, ...document.brand });

    const ratio = contrast(lightRole(css, 'primary'), lightRole(css, 'secondary-container'));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
