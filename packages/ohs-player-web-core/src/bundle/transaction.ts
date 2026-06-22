import type { FhirClient } from '../client/FhirClient';

/** HTTP verb for a transaction-Bundle entry's `request`. */
export type BundleEntryMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * One entry of a FHIR transaction Bundle. `resource` is omitted for DELETE; `fullUrl` carries a
 * `urn:uuid:` placeholder so later entries in the same Bundle can reference a resource the server
 * hasn't assigned an id to yet (resolved server-side on commit).
 */
export interface TransactionBundleEntry {
  fullUrl?: string;
  resource?: Record<string, unknown>;
  request: { method: BundleEntryMethod; url: string };
}

/** Minimal shape of a transaction-response Bundle (what `commitBundle` returns). */
export interface TransactionResponseBundle {
  resourceType: 'Bundle';
  type: string;
  entry?: { response?: { status?: string; location?: string } }[];
}

/** A `urn:uuid:` placeholder for a not-yet-created resource, referenceable within the same Bundle. */
export function newUrnUuid(): string {
  return `urn:uuid:${crypto.randomUUID()}`;
}

/**
 * Build one transaction-Bundle entry. Pass `fullUrl` (e.g. {@link newUrnUuid}) when other entries
 * must cross-reference this resource before the server assigns its id.
 *
 * @public
 */
export function bundleEntry(
  request: { method: BundleEntryMethod; url: string },
  resource?: Record<string, unknown>,
  fullUrl?: string,
): TransactionBundleEntry {
  return {
    ...(fullUrl ? { fullUrl } : {}),
    ...(resource ? { resource } : {}),
    request,
  };
}

/**
 * Submit `entries` as a single FHIR transaction Bundle via `client.transaction` (all-or-nothing).
 * Both single-resource saves (one entry) and multi-resource commits (with `urn:uuid:` cross-references)
 * go through this; the server resolves placeholders and applies the whole Bundle atomically.
 *
 * @public
 */
export async function commitBundle(
  client: FhirClient,
  entries: TransactionBundleEntry[],
): Promise<TransactionResponseBundle> {
  const bundle = { resourceType: 'Bundle', type: 'transaction', entry: entries };
  return (await client.transaction(bundle)) as TransactionResponseBundle;
}

/**
 * The server-assigned `{ResourceType}/{id}` for the entry at `index` in a transaction response,
 * parsed from its `response.location` (e.g. `Organization/1010/_history/1` → `Organization/1010`).
 * Returns `undefined` when absent.
 *
 * @public
 */
export function committedReference(
  response: TransactionResponseBundle,
  index = 0,
): string | undefined {
  const location = response.entry?.[index]?.response?.location ?? '';
  return /^([A-Za-z]+\/[^/]+)/.exec(location)?.[1];
}

/** The server-assigned id (just the id, not the typed reference) for the entry at `index`. */
export function committedId(response: TransactionResponseBundle, index = 0): string | undefined {
  return committedReference(response, index)?.split('/')[1];
}
