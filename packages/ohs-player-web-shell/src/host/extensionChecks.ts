import { defaultMessageCatalog, type PermissionMap } from 'ohs-player-web-core';
import type { PortalDefaults } from '../config/resolvePortalConfig';
import type { PortalRoute } from '../routes/types';
import type { PortalExtension } from './types';

const HOST_PATHS = ['/', '/login', '/logout', '/callback', '/unauthorized'];

interface Claim {
  kind: string;
  key: string;
}

interface Owner {
  id: string;
  index?: number;
}

function slotOf({ kind, key }: Claim): string {
  return `${kind}|${key}`;
}

function keysOf(kind: string, record: Readonly<Record<string, unknown>> | undefined): Claim[] {
  return Object.keys(record ?? {}).map((key) => ({ kind, key }));
}

function idsOf(
  kind: string,
  manifest: PortalExtension,
  items?: readonly { id: string }[],
): Claim[] {
  return (items ?? []).map((item) => ({ kind, key: `${manifest.id}.${item.id}` }));
}

function claimsOf(manifest: PortalExtension): Claim[] {
  return [
    { kind: 'extension id', key: manifest.id },
    ...idsOf('route id', manifest, manifest.routes),
    ...idsOf('nav id', manifest, manifest.nav),
    ...idsOf('widget id', manifest, manifest.widgets),
    ...idsOf('slot contribution id', manifest, manifest.slots),
    ...(manifest.routes ?? []).map((route) => ({ kind: 'route path', key: route.path })),
    ...keysOf('message key', manifest.messages),
    ...keysOf('flag', manifest.flags),
    ...keysOf('permission', manifest.permissions),
    ...keysOf('custom endpoint alias', manifest.customEndpoints),
  ];
}

function hostClaims(defaults: PortalDefaults, routes: readonly PortalRoute[]): Claim[] {
  const { platform } = defaults;
  const paths = [...HOST_PATHS, ...routes.map((route) => route.path)];
  return [
    ...keysOf('message key', defaultMessageCatalog),
    ...keysOf('message key', platform.i18n?.messages),
    ...keysOf('flag', platform.flags?.flags),
    ...keysOf('permission', platform.rbac?.permissionMap),
    ...keysOf('custom endpoint alias', platform.customEndpoints),
    ...paths.map((key) => ({ kind: 'route path', key })),
  ];
}

function clashMessage(
  manifest: PortalExtension,
  index: number,
  claim: Claim,
  owner: Owner,
): string {
  if (claim.kind === 'extension id') {
    return `Extensions at positions ${owner.index} and ${index} both use the id "${manifest.id}".`;
  }
  if (owner.index === index) {
    return `Extension "${manifest.id}" declares ${claim.kind} "${claim.key}" twice.`;
  }
  const other = owner.index === undefined ? 'the host' : `extension "${owner.id}"`;
  return `Extension "${manifest.id}" declares ${claim.kind} "${claim.key}", which ${other} already declares.`;
}

export function withoutClashes(
  defaults: PortalDefaults,
  routes: readonly PortalRoute[],
  manifests: readonly PortalExtension[],
  report: (message: string) => void,
): PortalExtension[] {
  const owners = new Map<string, Owner>();
  hostClaims(defaults, routes).forEach((claim) => owners.set(slotOf(claim), { id: 'host' }));

  return manifests.filter((manifest, index) => {
    const own = new Map<string, Owner>();
    for (const claim of claimsOf(manifest)) {
      const owner = owners.get(slotOf(claim)) ?? own.get(slotOf(claim));
      if (owner) {
        report(clashMessage(manifest, index, claim, owner));
        return false;
      }
      own.set(slotOf(claim), { id: manifest.id, index });
    }
    own.forEach((owner, slot) => owners.set(slot, owner));
    return true;
  });
}

export function missingPermission(
  manifest: PortalExtension,
  permissionMap: PermissionMap,
): string | undefined {
  const gated = [
    ...(manifest.routes ?? []).map((item) => ({ kind: 'route', item })),
    ...(manifest.nav ?? []).map((item) => ({ kind: 'nav entry', item })),
    ...(manifest.widgets ?? []).map((item) => ({ kind: 'widget', item })),
  ];
  const missing = gated.find(({ item }) => {
    const permission = item.requires?.permission;
    return permission !== undefined && !Object.hasOwn(permissionMap, permission);
  });
  if (!missing) return undefined;
  const { kind, item } = missing;
  return `Extension "${manifest.id}": ${kind} "${item.id}" requires permission "${item.requires?.permission}", which is not in the permission map.`;
}
