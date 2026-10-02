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
import {
  EMPTY_SETTINGS,
  hasSettings,
  sanitizeSettings,
  type DashboardSettings,
} from './widgetSettings';

export const LAYOUT_STORAGE_PREFIX = 'ohs-dashboard-layout:';
export const LEGACY_KPI_STORAGE_PREFIX = 'ohs-dashboard-kpis:';

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

/** What a user has arranged: the cards per region and the settings chosen for them. */
export interface DashboardArrangement {
  layout: DashboardLayout;
  settings: DashboardSettings;
}

export interface DashboardLayoutState extends DashboardArrangement {
  save: (arrangement: DashboardArrangement) => void;
}

interface StoredArrangement {
  layout: unknown;
  settings?: unknown;
}

function readStored(key: string): StoredArrangement | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    const stored = JSON.parse(raw) as { version?: unknown; layout?: unknown; settings?: unknown };
    return stored?.version === LAYOUT_VERSION
      ? { layout: stored.layout, settings: stored.settings }
      : undefined;
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

function writeStored(key: string, arrangement: DashboardArrangement | undefined): void {
  withStorage((storage) => {
    if (!arrangement) {
      storage.removeItem(key);
      return;
    }
    const { layout, settings } = arrangement;
    const record = hasSettings(settings)
      ? { version: LAYOUT_VERSION, layout, settings }
      : { version: LAYOUT_VERSION, layout };
    storage.setItem(key, JSON.stringify(record));
  });
}

function legacyKpis(sub: string): string[] | undefined {
  try {
    const raw = window.localStorage.getItem(`${LEGACY_KPI_STORAGE_PREFIX}${sub}`);
    if (raw === null) return undefined;
    const ids: unknown = JSON.parse(raw);
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === 'string').map((id) => `kpi.${id}`)
      : undefined;
  } catch {
    return undefined;
  }
}

function migrateLegacy(sub: string, defaults: DashboardLayout): StoredArrangement | undefined {
  const kpi = legacyKpis(sub);
  if (!kpi) return undefined;
  const layout = { ...defaults, kpi };
  const kept = sameLayout(layout, defaults) ? undefined : { layout, settings: EMPTY_SETTINGS };
  writeStored(`${LAYOUT_STORAGE_PREFIX}${sub}`, kept);
  withStorage((storage) => storage.removeItem(`${LEGACY_KPI_STORAGE_PREFIX}${sub}`));
  return kept;
}

function readArrangement(sub: string, defaults: DashboardLayout): StoredArrangement | undefined {
  return readStored(`${LAYOUT_STORAGE_PREFIX}${sub}`) ?? migrateLegacy(sub, defaults);
}

/**
 * The signed in user's dashboard layout and card settings, kept in this browser per user `sub`,
 * trimmed on read to what the catalogue holds and the deployment allows. With nothing stored the
 * layout is `defaults` and every card uses its default settings.
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
  const [stored, setStored] = useState(() => ({ sub, raw: readArrangement(sub, defaults) }));
  const current = stored.sub === sub ? stored.raw : readArrangement(sub, defaults);
  const raw = customizable ? current : undefined;

  const layout = useMemo(() => {
    const placed = new Set(DASHBOARD_REGIONS.flatMap((region) => defaults[region]));
    const userAllowed: IdTest = (id) => placed.has(id) || (allowed?.(id) ?? true);
    return (
      sanitizeLayout(raw?.layout, catalogue, {
        allowed: userAllowed,
        isVisible,
      }) ??
      sanitizeLayout(defaults, catalogue, { isVisible }) ??
      EMPTY_LAYOUT
    );
  }, [raw, catalogue, defaults, allowed, isVisible]);

  const settings = useMemo(() => sanitizeSettings(raw?.settings, catalogue), [raw, catalogue]);

  const save = useCallback(
    (next: DashboardArrangement) => {
      const isDefault = sameLayout(next.layout, defaults) && !hasSettings(next.settings);
      const kept = isDefault ? undefined : next;
      writeStored(`${LAYOUT_STORAGE_PREFIX}${sub}`, kept);
      setStored({ sub, raw: kept });
    },
    [sub, defaults],
  );

  return { layout, settings, save };
}
