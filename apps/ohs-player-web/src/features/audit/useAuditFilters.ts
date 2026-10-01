import { useMemo } from 'react';
import { useClearFilterParams, useFilterParam } from 'ohs-player-web-shell';
import {
  AUDIT_ACTIONS,
  AUDIT_FILTER_PARAMS,
  type AuditFilters,
  isAuditAction,
  isIsoDate,
  isResourceTypeName,
} from './auditFilters';

type Setter = (value: string | null) => void;

export interface AuditFilterSetters {
  action: Setter;
  resourceType: Setter;
  agent: Setter;
  from: Setter;
  to: Setter;
}

export interface AuditFilterState {
  filters: AuditFilters;
  setters: AuditFilterSetters;
  clear: () => void;
  hasFilters: boolean;
}

export function useAuditFilters(): AuditFilterState {
  const [action, setAction] = useFilterParam('action', AUDIT_ACTIONS);
  const [resourceType, setResourceType] = useFilterParam('resourceType');
  const [agent, setAgent] = useFilterParam('agent');
  const [from, setFrom] = useFilterParam('from');
  const [to, setTo] = useFilterParam('to');
  const clear = useClearFilterParams(AUDIT_FILTER_PARAMS);

  const filters = useMemo<AuditFilters>(
    () => ({
      action: isAuditAction(action) ? action : null,
      resourceType: isResourceTypeName(resourceType) ? resourceType : null,
      agent: agent?.trim() || null,
      from: isIsoDate(from) ? from : null,
      to: isIsoDate(to) ? to : null,
    }),
    [action, resourceType, agent, from, to],
  );

  const setters = useMemo<AuditFilterSetters>(
    () => ({
      action: setAction,
      resourceType: setResourceType,
      agent: setAgent,
      from: setFrom,
      to: setTo,
    }),
    [setAction, setResourceType, setAgent, setFrom, setTo],
  );

  return {
    filters,
    setters,
    clear,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
