import {
  resolvePortalConfig,
  type PortalDefaults,
  type PortalDocument,
  type ResolvedPortalConfig,
} from '../config/resolvePortalConfig';
import type { PortalRoute } from '../routes/types';
import type { ExtensionContributions, PortalExtension } from './types';

export interface PortalHostInput {
  defaults: PortalDefaults;
  document?: PortalDocument;
  extensions?: readonly PortalExtension[];
  routes?: readonly PortalRoute[];
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
  return Object.fromEntries(manifests.flatMap((manifest) => Object.entries(select(manifest) ?? {})));
}

function withExtensions(defaults: PortalDefaults, manifests: readonly PortalExtension[]): PortalDefaults {
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

function contributionsOf(manifests: readonly PortalExtension[]): ExtensionContributions {
  return {
    nav: manifests.flatMap((manifest) => manifest.nav ?? []),
    routes: manifests.flatMap((manifest) => manifest.routes ?? []),
    widgets: manifests.flatMap((manifest) => manifest.widgets ?? []),
    slots: manifests.flatMap((manifest) => manifest.slots ?? []),
    questionnaires: Object.fromEntries(
      manifests.flatMap((manifest) =>
        manifest.questionnaires ? [[manifest.id, manifest.questionnaires]] : [],
      ),
    ),
  };
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
}: PortalHostInput): ResolvedPortalHost {
  const contributions = contributionsOf(extensions);
  return {
    portal: resolvePortalConfig(withExtensions(defaults, extensions), document),
    routes: [...routes, ...contributions.routes],
    contributions,
  };
}
