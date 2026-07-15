import {
  bundleEntry,
  committedReference,
  commitBundle,
  newUrnUuid,
  type FhirClient,
  type TransactionBundleEntry,
  type TransactionResponseBundle,
} from 'ohs-player-web-core';
import {
  buildNewUserBundle,
  buildNewUserPayload,
  locationManagingOrgPatch,
  organizationAffiliationFromLinks,
  type NewUserFields,
} from '../sdc/resourceFromAnswers';
import type { DraftCareTeam, DraftLocation, DraftOrganization, DraftUser, SetupWizardDraft } from './types';

function bareLocationId(ref: string): string {
  return ref.replace(/^Location\//, '');
}

/** Build phase-1 transaction entries (Locations, Orgs, affiliations, CareTeams). */
export function buildPhase1Entries(draft: SetupWizardDraft): TransactionBundleEntry[] {
  const managedBy = new Map<string, string>();
  for (const org of draft.organizations) {
    for (const ref of org.managedLocationRefs) {
      if (ref.startsWith('urn:uuid:')) managedBy.set(ref, org.fullUrl);
    }
  }

  const entries: TransactionBundleEntry[] = [];

  for (const loc of draft.locations) {
    const resource: Record<string, unknown> = { ...loc.resource };
    const orgRef = managedBy.get(loc.fullUrl);
    if (orgRef) resource.managingOrganization = { reference: orgRef };
    entries.push(bundleEntry({ method: 'POST', url: 'Location' }, resource, loc.fullUrl));
  }

  for (const org of draft.organizations) {
    entries.push(bundleEntry({ method: 'POST', url: 'Organization' }, org.resource, org.fullUrl));

    const partOf = (org.resource.partOf as { reference?: string } | undefined)?.reference;
    if (partOf) {
      entries.push(
        bundleEntry(
          { method: 'POST', url: 'OrganizationAffiliation' },
          organizationAffiliationFromLinks({
            organizationRef: partOf,
            participatingOrganizationRef: org.fullUrl,
          }),
          newUrnUuid(),
        ),
      );
    }

    const serverLocationRefs = org.managedLocationRefs.filter((ref) => !ref.startsWith('urn:uuid:'));
    for (const ref of serverLocationRefs) {
      entries.push(
        bundleEntry(
          { method: 'PATCH', url: `Location/${bareLocationId(ref)}` },
          locationManagingOrgPatch(org.fullUrl),
        ),
      );
    }

    if (org.managedLocationRefs.length > 0) {
      entries.push(
        bundleEntry(
          { method: 'POST', url: 'OrganizationAffiliation' },
          organizationAffiliationFromLinks({
            organizationRef: org.fullUrl,
            locationRefs: org.managedLocationRefs,
          }),
          newUrnUuid(),
        ),
      );
    }
  }

  for (const ct of draft.careTeams) {
    entries.push(bundleEntry({ method: 'POST', url: 'CareTeam' }, ct.resource, ct.fullUrl));
  }

  return entries;
}

/** Map each entry's fullUrl to the committed `ResourceType/id` from the transaction response. */
export function mapUrnsFromResponse(
  entries: TransactionBundleEntry[],
  response: TransactionResponseBundle,
): Record<string, string> {
  const map: Record<string, string> = {};
  entries.forEach((entry, index) => {
    if (!entry.fullUrl?.startsWith('urn:uuid:')) return;
    const committed = committedReference(response, index);
    if (committed) map[entry.fullUrl] = committed;
  });
  return map;
}

function rewriteRef(ref: string, urnMap: Record<string, string>): string {
  return urnMap[ref] ?? ref;
}

function rewriteUserFields(fields: NewUserFields, urnMap: Record<string, string>): NewUserFields {
  return {
    ...fields,
    organizations: fields.organizations.map((r) => rewriteRef(r, urnMap)),
    locations: fields.locations.map((r) => rewriteRef(r, urnMap)),
  };
}

export interface CommitUserResult {
  localId: string;
  status: 'success' | 'failed';
  createdPractitionerId?: string;
  error?: string;
}

export interface GatewayUsersApi {
  post: (body: unknown) => Promise<Record<string, unknown>>;
}

/**
 * Phase 1: atomic Bundle for non-user resources. Updates draft.urnMap and phase1Complete.
 */
export async function commitPhase1(
  client: FhirClient,
  draft: SetupWizardDraft,
): Promise<{ draft: SetupWizardDraft; response: TransactionResponseBundle }> {
  const entries = buildPhase1Entries(draft);
  if (entries.length === 0) {
    return {
      draft: { ...draft, phase1Complete: true, urnMap: { ...draft.urnMap } },
      response: { resourceType: 'Bundle', type: 'transaction-response', entry: [] },
    };
  }
  const response = await commitBundle(client, entries);
  const urnMap = { ...draft.urnMap, ...mapUrnsFromResponse(entries, response) };
  return { draft: { ...draft, urnMap, phase1Complete: true }, response };
}

/**
 * Phase 2: create one user via gateway + assignment Bundle.
 */
export async function commitOneUser(
  client: FhirClient,
  usersApi: GatewayUsersApi,
  user: DraftUser,
  urnMap: Record<string, string>,
  careTeamsById: Map<string, Record<string, unknown>>,
): Promise<CommitUserResult> {
  try {
    const fields = rewriteUserFields(user.fields, urnMap);
    const created = await usersApi.post(buildNewUserPayload(fields));
    const createdId = typeof created.id === 'string' ? created.id : '';

    const careTeams = user.careTeamIds
      .map((id) => {
        const resolved = rewriteRef(id, urnMap);
        const bare = resolved.replace(/^CareTeam\//, '');
        const fromMap = careTeamsById.get(bare) ?? careTeamsById.get(resolved);
        if (fromMap) return fromMap;
        if (urnMap[id] || resolved.includes('/')) {
          return { resourceType: 'CareTeam', id: bare, participant: [] };
        }
        return undefined;
      })
      .filter((r): r is Record<string, unknown> => Boolean(r));

    if (createdId) {
      const bundle = buildNewUserBundle(created, fields, careTeams);
      if (bundle.entry.length > 0) {
        await commitBundle(client, bundle.entry);
      }
    }

    return { localId: user.localId, status: 'success', createdPractitionerId: createdId || undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { localId: user.localId, status: 'failed', error };
  }
}

export async function commitPhase2(
  client: FhirClient,
  usersApi: GatewayUsersApi,
  draft: SetupWizardDraft,
  opts?: {
    onlyLocalIds?: string[];
    careTeamsById?: Map<string, Record<string, unknown>>;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<SetupWizardDraft> {
  const careTeamsById = opts?.careTeamsById ?? new Map<string, Record<string, unknown>>();
  const targets = draft.users.filter((u) => {
    if (opts?.onlyLocalIds) return opts.onlyLocalIds.includes(u.localId);
    return u.status !== 'success';
  });

  let users = [...draft.users];
  let done = 0;
  const total = targets.length;
  opts?.onProgress?.(0, total);
  for (const user of targets) {
    const result = await commitOneUser(client, usersApi, user, draft.urnMap, careTeamsById);
    users = users.map((u) =>
      u.localId === result.localId
        ? {
            ...u,
            status: result.status,
            error: result.error,
            createdPractitionerId: result.createdPractitionerId ?? u.createdPractitionerId,
          }
        : u,
    );
    done += 1;
    opts?.onProgress?.(done, total);
  }
  return { ...draft, users };
}

export function draftLocationEntry(
  resource: DraftLocation['resource'],
  fullUrl = newUrnUuid(),
): DraftLocation {
  return { fullUrl, resource };
}

export function draftOrganizationEntry(
  resource: DraftOrganization['resource'],
  managedLocationRefs: string[],
  fullUrl = newUrnUuid(),
): DraftOrganization {
  return { fullUrl, resource, managedLocationRefs };
}

export function draftCareTeamEntry(
  resource: DraftCareTeam['resource'],
  fullUrl = newUrnUuid(),
): DraftCareTeam {
  return { fullUrl, resource };
}
