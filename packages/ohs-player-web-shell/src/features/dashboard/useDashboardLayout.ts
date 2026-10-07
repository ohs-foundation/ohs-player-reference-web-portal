import { useAuth } from 'ohs-player-web-core';
import { useCallback, useMemo, useState } from 'react';
import { DASHBOARD_REGIONS } from '../../host/types';
import {
  EMPTY_LAYOUT,
  sameLayout,
  sanitizeLayout,
  type DashboardLayout,
  type IdTest,
} from './dashboardLayout';
import type { WidgetDefinition } from './widgetCatalogue';

export const LAYOUT_STORAGE_PREFIX = 'ohs-dashboard-layout:';

const LAYOUT_VERSION = 1;

export interface DashboardLayoutOptions {
  catalogue: readonly WidgetDefinition[];
  /** The deployment layout: what a user starts from and what a save equal to it returns to. */
  defaults: DashboardLayout;
  /** Which ids a user may place beyond the deployment layout. Absent allows every id. */
  allowed?: IdTest;
  isVisible?: IdTest;
  /** `false` ignores any stored layout and shows `defaults`. */
  customizable?: boolean;
}

export interface DashboardLayoutState {
  layout: DashboardLayout;
  save: (layout: DashboardLayout) => void;
}

function storageKey(sub: string): string {
  return `${LAYOUT_STORAGE_PREFIX}${sub}`;
}

function readStored(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    const stored = JSON.parse(raw) as { version?: unknown; layout?: unknown } | null;
    return stored?.version === LAYOUT_VERSION ? stored.layout : undefined;
  } catch {
    return undefined;
  }
}

function withStorage(action: (storage: Storage) => void): void {
  try {
    action(window.localStorage);
  } catch {
    return;
  }
}

function writeStored(key: string, layout: DashboardLayout | undefined): void {
  withStorage((storage) => {
    if (layout) storage.setItem(key, JSON.stringify({ version: LAYOUT_VERSION, layout }));
    else storage.removeItem(key);
  });
}

/**
 * The signed in user's dashboard layout, kept in this browser per user `sub`, trimmed on read to
 * what the catalogue holds and the deployment allows. With nothing stored it is `defaults`.
 */
export function useDashboardLayout({
  catalogue,
  defaults,
  allowed,
  isVisible,
  customizable = true,
}: DashboardLayoutOptions): DashboardLayoutState {
  const { user } = useAuth();
  const sub = user?.sub ?? '';
  const [stored, setStored] = useState(() => ({ sub, raw: readStored(storageKey(sub)) }));
  const current = stored.sub === sub ? stored.raw : readStored(storageKey(sub));
  const raw = customizable ? current : undefined;

  const layout = useMemo(() => {
    const placed = new Set(DASHBOARD_REGIONS.flatMap((region) => defaults[region]));
    const userAllowed: IdTest = (id) => placed.has(id) || (allowed?.(id) ?? true);
    return (
      sanitizeLayout(raw, catalogue, {
        allowed: userAllowed,
        isVisible,
      }) ??
      sanitizeLayout(defaults, catalogue, { isVisible }) ??
      EMPTY_LAYOUT
    );
  }, [raw, catalogue, defaults, allowed, isVisible]);

  const save = useCallback(
    (next: DashboardLayout) => {
      const kept = sameLayout(next, defaults) ? undefined : next;
      writeStored(storageKey(sub), kept);
      setStored({ sub, raw: kept });
    },
    [sub, defaults],
  );

  return { layout, save };
}
