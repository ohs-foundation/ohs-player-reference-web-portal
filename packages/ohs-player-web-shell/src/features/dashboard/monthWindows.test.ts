import { afterEach, describe, expect, it } from 'vitest';
import { monthWindows } from './monthWindows';

const zone = process.env.TZ;

describe('monthWindows', () => {
  afterEach(() => {
    process.env.TZ = zone;
  });

  it('covers six months ending with the current one, across a year boundary', () => {
    const windows = monthWindows(new Date(2026, 1, 15, 9, 30));

    expect(windows.map((w) => [w.ge, w.lt])).toEqual([
      ['ge2025-09-01', 'lt2025-10-01'],
      ['ge2025-10-01', 'lt2025-11-01'],
      ['ge2025-11-01', 'lt2025-12-01'],
      ['ge2025-12-01', 'lt2026-01-01'],
      ['ge2026-01-01', 'lt2026-02-01'],
      ['ge2026-02-01', 'lt2026-03-01'],
    ]);
  });

  it('uses local dates in a zone ahead of UTC, just after midnight on the first', () => {
    process.env.TZ = 'Africa/Nairobi';
    const [only] = monthWindows(new Date(2026, 9, 1, 0, 30), 1);

    expect([only.ge, only.lt]).toEqual(['ge2026-10-01', 'lt2026-11-01']);
    expect(only.start.getDate()).toBe(1);
  });
});
