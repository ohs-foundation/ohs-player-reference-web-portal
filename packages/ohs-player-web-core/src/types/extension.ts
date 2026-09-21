import type { ComponentType } from 'react';
import type { Questionnaire } from '../sdc';
import type { CustomEndpoints, PermissionMap } from './config';

/** Gates evaluated in order: feature flag, then signed-in session, then permission. */
export interface ExtensionRequirements {
  flag?: string;
  permission?: string;
}

/** A page added under the portal frame; `load` resolves its default-exported component. */
export interface ExtensionRoute {
  id: string;
  path: string;
  load: () => Promise<{ default: ComponentType }>;
  requires?: ExtensionRequirements;
}

/** A sidebar entry, placed among the host's entries by `order`. Icons fall back to a default. */
export interface ExtensionNavEntry {
  id: string;
  to: string;
  labelKey: string;
  order: number;
  requires?: ExtensionRequirements;
  icon?: ComponentType<{ size?: number }>;
  activeIcon?: ComponentType<{ size?: number }>;
}

/** A dashboard tile placed in `region` by `order`; `load` resolves its default-exported component. */
export interface ExtensionWidget<Region extends string = string> {
  id: string;
  region: Region;
  order: number;
  load: () => Promise<{ default: ComponentType }>;
  requires?: ExtensionRequirements;
}

/** A component rendered into the named slot, receiving that slot's context. */
export type ExtensionSlotContribution<
  Slots extends Record<string, unknown> = Record<string, unknown>,
> = {
  [Name in keyof Slots & string]: {
    id: string;
    slot: Name;
    order: number;
    component: ComponentType<{ context: Slots[Name] }>;
  };
}[keyof Slots & string];

/**
 * Everything one extension contributes to a host. `Region` and `Slots` are supplied by the host,
 * which binds them to its dashboard regions and slot contexts.
 */
export interface ExtensionManifest<
  Region extends string = string,
  Slots extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  routes?: readonly ExtensionRoute[];
  nav?: readonly ExtensionNavEntry[];
  widgets?: readonly ExtensionWidget<Region>[];
  slots?: readonly ExtensionSlotContribution<Slots>[];
  messages?: Readonly<Record<string, string>>;
  flags?: Readonly<Record<string, boolean>>;
  permissions?: PermissionMap;
  customEndpoints?: CustomEndpoints;
  questionnaires?: Readonly<Record<string, Questionnaire>>;
}
