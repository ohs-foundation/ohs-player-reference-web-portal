import { resolvePortalConfig, type PortalDocument } from 'ohs-player-web-shell';
import type { PortalNavigationEntry } from 'ohs-player-web-core';
import { portalDefaults } from '../../config/platform';

export interface PreviewNavEntry {
  id: string;
  labelKey: string;
  to: string;
  switchedOff: boolean;
}

export function previewNavigation(
  document: PortalDocument,
  extensionNav: readonly PortalNavigationEntry[],
): PreviewNavEntry[] {
  const { navigation, platform } = resolvePortalConfig(portalDefaults, document);
  const flags = platform.flags?.flags ?? {};
  return [...navigation, ...extensionNav]
    .sort((a, b) => a.order - b.order)
    .map(({ id, labelKey, to, requires }) => ({
      id,
      labelKey,
      to,
      switchedOff: requires?.flag !== undefined && flags[requires.flag] === false,
    }));
}
