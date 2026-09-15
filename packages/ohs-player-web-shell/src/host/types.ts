import type { Practitioner } from '@medplum/fhirtypes';
import type {
  ExtensionManifest,
  ExtensionNavEntry,
  ExtensionRoute,
  ExtensionSlotContribution,
  ExtensionWidget,
  Questionnaire,
} from 'ohs-player-web-core';

export const DASHBOARD_REGIONS = ['kpi', 'main', 'side'] as const;

/** Where a dashboard widget renders: the KPI strip, the main column or the side column. */
export type DashboardRegion = (typeof DASHBOARD_REGIONS)[number];

/** The context each slot passes to its contributions, keyed by slot name. */
export type SlotContexts = {
  'users.rowActions': { practitioner: Practitioner };
};

export type SlotName = keyof SlotContexts;

export const SLOT_NAMES: readonly SlotName[] = ['users.rowActions'];

/** An extension manifest bound to this shell's dashboard regions and slots. */
export type PortalExtension = ExtensionManifest<DashboardRegion, SlotContexts>;

/** What the host's extensions contribute, after merging and namespacing. */
export interface ExtensionContributions {
  nav: readonly ExtensionNavEntry[];
  routes: readonly ExtensionRoute[];
  widgets: readonly ExtensionWidget<DashboardRegion>[];
  slots: readonly ExtensionSlotContribution<SlotContexts>[];
  questionnaires: Readonly<Record<string, Readonly<Record<string, Questionnaire>>>>;
}
