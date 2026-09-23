import { useAuth } from 'ohs-player-web-core';
import { useCallback, useState } from 'react';
import type { KpiId } from './kpiCatalogue';
import { DEFAULT_KPIS, MAX_KPIS, sanitizeKpis } from './kpiSelection';

export const KPI_STORAGE_PREFIX = 'ohs-dashboard-kpis:';

export interface DashboardKpis {
  selected: readonly KpiId[];
  save: (ids: readonly KpiId[]) => void;
  max: number;
}

function readKpis(key: string): readonly KpiId[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? DEFAULT_KPIS : sanitizeKpis(JSON.parse(raw));
  } catch {
    return DEFAULT_KPIS;
  }
}

function writeKpis(key: string, ids: readonly KpiId[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage blocked or full: the selection still applies until reload.
  }
}

/** The signed-in user's dashboard KPI selection, kept in this browser per user `sub`. */
export function useDashboardKpis(): DashboardKpis {
  const { user } = useAuth();
  const key = `${KPI_STORAGE_PREFIX}${user?.sub ?? ''}`;
  const [stored, setStored] = useState(() => ({ key, ids: readKpis(key) }));

  const save = useCallback(
    (ids: readonly KpiId[]) => {
      const next = sanitizeKpis(ids);
      writeKpis(key, next);
      setStored({ key, ids: next });
    },
    [key],
  );

  return { selected: stored.key === key ? stored.ids : readKpis(key), save, max: MAX_KPIS };
}
