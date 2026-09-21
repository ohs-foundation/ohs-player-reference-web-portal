import {
  resolvePortalConfig,
  type PortalDefaults,
  type PortalDocument,
  type ResolvedPortalConfig,
} from '../config/resolvePortalConfig';
import type { PortalRoute } from '../routes/types';
import { missingPermission, withoutClashes } from './extensionChecks';
import type { ExtensionContributions, PortalExtension } from './types';

export interface PortalHostInput {
  defaults: PortalDefaults;
  document?: PortalDocument;
  extensions?: readonly PortalExtension[];
  routes?: readonly PortalRoute[];
  /** Throw on an invalid extension instead of reporting it through `onError` and dropping it. */
  development: boolean;
}

export interface ResolvedPortalHost {
  portal: ResolvedPortalConfig;
  routes: readonly PortalRoute[];
  contributions: ExtensionContributions;
}

function fromExtensions<T>(
  manifests: readonly PortalExtension[],
  select: (manifest: PortalExtension) => Readonly<Record<string, T>> | undefined,
): Record<string, T> {
  return Object.fromEntries(
    manifests.flatMap((manifest) => Object.entries(select(manifest) ?? {})),
  );
}

function withExtensions(
  defaults: PortalDefaults,
  manifests: readonly PortalExtension[],
): PortalDefaults {
  const { platform } = defaults;
  return {
    ...defaults,
    platform: {
      ...platform,
      i18n: {
        ...platform.i18n,
        messages: { ...fromExtensions(manifests, (m) => m.messages), ...platform.i18n?.messages },
      },
      flags: {
        ...platform.flags,
        flags: { ...fromExtensions(manifests, (m) => m.flags), ...platform.flags?.flags },
      },
      rbac: {
        ...platform.rbac,
        permissionMap: {
          ...fromExtensions(manifests, (m) => m.permissions),
          ...platform.rbac?.permissionMap,
        },
      },
      customEndpoints: {
        ...fromExtensions(manifests, (m) => m.customEndpoints),
        ...platform.customEndpoints,
      },
    },
  };
}

function namespaced<T extends { id: string }>(
  manifest: PortalExtension,
  items?: readonly T[],
): T[] {
  return (items ?? []).map((item) => ({ ...item, id: `${manifest.id}.${item.id}` }));
}

function contributionsOf(manifests: readonly PortalExtension[]): ExtensionContributions {
  return {
    nav: manifests.flatMap((manifest) => namespaced(manifest, manifest.nav)),
    routes: manifests.flatMap((manifest) => namespaced(manifest, manifest.routes)),
    widgets: manifests.flatMap((manifest) => namespaced(manifest, manifest.widgets)),
    slots: manifests.flatMap((manifest) => namespaced(manifest, manifest.slots)),
    questionnaires: Object.fromEntries(
      manifests.flatMap((manifest) =>
        manifest.questionnaires ? [[manifest.id, manifest.questionnaires]] : [],
      ),
    ),
  };
}

function reporter(development: boolean, onError?: (error: unknown) => void) {
  return (message: string): void => {
    const error = new Error(message);
    if (development) throw error;
    onError?.(error);
  };
}

function withPermissionsMet(
  manifests: readonly PortalExtension[],
  resolve: (manifests: readonly PortalExtension[]) => ResolvedPortalConfig,
  report: (message: string) => void,
): { manifests: readonly PortalExtension[]; portal: ResolvedPortalConfig } {
  const portal = resolve(manifests);
  const permissionMap = portal.platform.rbac?.permissionMap ?? {};
  const met = manifests.filter((manifest) => {
    const problem = missingPermission(manifest, permissionMap);
    if (problem) report(problem);
    return !problem;
  });
  return met.length === manifests.length
    ? { manifests, portal }
    : withPermissionsMet(met, resolve, report);
}

/**
 * Merges extension contributions over the host's defaults, then the configuration document over
 * both, so a deployment can still override an extension. Call once at startup, before render.
 */
export function createPortalHost({
  defaults,
  document,
  extensions = [],
  routes = [],
  development,
}: PortalHostInput): ResolvedPortalHost {
  const report = reporter(development, defaults.platform.onError);
  const { manifests, portal } = withPermissionsMet(
    withoutClashes(defaults, routes, extensions, report),
    (candidates) => resolvePortalConfig(withExtensions(defaults, candidates), document),
    report,
  );
  const contributions = contributionsOf(manifests);
  return { portal, routes: [...routes, ...contributions.routes], contributions };
}
