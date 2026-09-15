import { validateExtensionManifest } from 'ohs-player-web-core';
import { DASHBOARD_REGIONS, SLOT_NAMES } from 'ohs-player-web-shell';
import { describe, expect, it } from 'vitest';
import { schedulesExtension } from './manifest';

describe('schedules manifest', () => {
  it("passes validateExtensionManifest with the shell's regions and slots", () => {
    const result = validateExtensionManifest(schedulesExtension, {
      regions: DASHBOARD_REGIONS,
      slots: SLOT_NAMES,
    });

    expect(result.success ? [] : result.errors).toEqual([]);
  });
});
