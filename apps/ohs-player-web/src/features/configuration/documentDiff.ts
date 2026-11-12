import { z } from 'zod';
import { isJsonObject } from './configDraft';

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface DocumentChange {
  kind: ChangeKind;
  field: string;
  path: string;
  before?: unknown;
  after?: unknown;
}

export const GUARDED_FIELDS: readonly string[] = [
  '$schema',
  'fhirBaseUrl',
  'fhirVersion',
  'oidcIssuer',
  'clientId',
  'permissionMap',
  'customEndpoints',
];

type Segment = string | number;
type Entries = readonly (readonly [string, unknown])[];

function sameJson(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => sameJson(item, b[index]));
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]))
    );
  }
  return false;
}

function keyedById(items: readonly unknown[]): Entries | undefined {
  const entries = items.map((item) =>
    isJsonObject(item) && typeof item.id === 'string' ? ([item.id, item] as const) : undefined,
  );
  if (entries.some((entry) => entry === undefined)) return undefined;
  const keyed = entries as Entries;
  return new Set(keyed.map(([id]) => id)).size === keyed.length ? keyed : undefined;
}

function change(
  kind: ChangeKind,
  path: readonly Segment[],
  values: Pick<DocumentChange, 'before' | 'after'>,
): DocumentChange {
  return { kind, field: String(path[0]), path: z.core.toDotPath([...path]), ...values };
}

function diffEntries(
  changes: DocumentChange[],
  path: readonly Segment[],
  before: Entries,
  after: Entries,
): void {
  const afterValues = new Map(after);
  const beforeKeys = new Set(before.map(([key]) => key));
  for (const [key, value] of before) {
    if (afterValues.has(key)) diffInto(changes, [...path, key], value, afterValues.get(key));
    else changes.push(change('removed', [...path, key], { before: value }));
  }
  for (const [key, value] of after) {
    if (!beforeKeys.has(key)) changes.push(change('added', [...path, key], { after: value }));
  }
}

function diffInto(
  changes: DocumentChange[],
  path: readonly Segment[],
  before: unknown,
  after: unknown,
): void {
  if (sameJson(before, after)) return;
  if (isJsonObject(before) && isJsonObject(after)) {
    diffEntries(changes, path, Object.entries(before), Object.entries(after));
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const beforeEntries = keyedById(before);
    const afterEntries = keyedById(after);
    if (beforeEntries && afterEntries) {
      diffEntries(changes, path, beforeEntries, afterEntries);
      return;
    }
  }
  changes.push(change('changed', path, { before, after }));
}

/**
 * Field by field changes from `before` to `after`. Arrays of entries with unique string ids, such as
 * `navigation`, are matched by id, so a reorder reads as changed `order` values. Other arrays compare
 * as one value.
 */
export function diffDocuments(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DocumentChange[] {
  const changes: DocumentChange[] = [];
  diffEntries(changes, [], Object.entries(before), Object.entries(after));
  return changes;
}

export function guardedChanges(changes: readonly DocumentChange[]): DocumentChange[] {
  return changes.filter((entry) => GUARDED_FIELDS.includes(entry.field));
}
