import { useState } from 'react';
import type { DashboardArrangement } from './useDashboardLayout';

export interface DashboardDraft {
  editing: boolean;
  /** The draft while editing, else the saved arrangement. */
  arrangement: DashboardArrangement;
  start: () => void;
  stop: () => void;
  update: (next: DashboardArrangement) => void;
}

/** An edit session over `saved`. Nothing is written until the caller saves `arrangement`. */
export function useDashboardDraft(saved: DashboardArrangement): DashboardDraft {
  const [draft, setDraft] = useState<DashboardArrangement | null>(null);
  return {
    editing: draft !== null,
    arrangement: draft ?? saved,
    start: () => setDraft(saved),
    stop: () => setDraft(null),
    update: setDraft,
  };
}
