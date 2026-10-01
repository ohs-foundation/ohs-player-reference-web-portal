import { type AuditAction, RESOURCE_TYPES_SYSTEM, type SearchParams } from 'ohs-player-web-core';

export const AUDIT_ACTIONS: readonly AuditAction[] = ['C', 'R', 'U', 'D'];

export const AUDIT_FILTER_PARAMS = ['action', 'resourceType', 'agent', 'from', 'to'] as const;

export interface AuditFilters {
  action: AuditAction | null;
  resourceType: string | null;
  agent: string | null;
  from: string | null;
  to: string | null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RESOURCE_TYPE_NAME = /^[A-Z][A-Za-z]+$/;

function localMidnight(iso: string, dayOffset = 0): Date | undefined {
  const match = ISO_DATE.exec(iso);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const real =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? new Date(year, month - 1, day + dayOffset) : undefined;
}

export function isIsoDate(value: string | null): value is string {
  return value !== null && localMidnight(value) !== undefined;
}

export function isResourceTypeName(value: string | null): value is string {
  return value !== null && RESOURCE_TYPE_NAME.test(value);
}

export function isAuditAction(value: string | null): value is AuditAction {
  return AUDIT_ACTIONS.some((action) => action === value);
}

export function isRangeInverted(from: string | null, to: string | null): boolean {
  return isIsoDate(from) && isIsoDate(to) && from > to;
}

export function localDayStart(iso: string): string | undefined {
  return localMidnight(iso)?.toISOString();
}

export function nextLocalDayStart(iso: string): string | undefined {
  return localMidnight(iso, 1)?.toISOString();
}

// The URL holds calendar days in the viewer's zone; the server reads zoneless dates in its own.
function dateBounds(from: string | null, to: string | null): string[] {
  if (isRangeInverted(from, to)) return [];
  const bounds: string[] = [];
  const start = isIsoDate(from) ? localDayStart(from) : undefined;
  const end = isIsoDate(to) ? nextLocalDayStart(to) : undefined;
  if (start) bounds.push(`ge${start}`);
  if (end) bounds.push(`lt${end}`);
  return bounds;
}

export function auditSearchParams(filters: AuditFilters): SearchParams {
  const params: Record<string, string | string[]> = { _sort: '-date' };
  if (filters.action) params.action = filters.action;
  if (isResourceTypeName(filters.resourceType)) {
    params['entity-type'] = `${RESOURCE_TYPES_SYSTEM}|${filters.resourceType}`;
  }
  const agent = filters.agent?.trim();
  if (agent) params['agent-name'] = agent;
  const date = dateBounds(filters.from, filters.to);
  if (date.length > 0) params.date = date;
  return params;
}
