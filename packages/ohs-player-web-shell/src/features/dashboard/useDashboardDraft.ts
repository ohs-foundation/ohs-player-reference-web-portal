import { useState } from 'react';
import type { DashboardLayout } from './dashboardLayout';

export interface DashboardDraft {
  editing: boolean;
  /** The draft while editing, else the saved layout. */
  layout: DashboardLayout;
  start: () => void;
  stop: () => void;
  update: (next: DashboardLayout) => void;
}

/** An edit session over `saved`. Nothing is written until the caller saves `layout`. */
export function useDashboardDraft(saved: DashboardLayout): DashboardDraft {
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  return {
    editing: draft !== null,
    layout: draft ?? saved,
    start: () => setDraft(saved),
    stop: () => setDraft(null),
    update: setDraft,
  };
}
