import { useCallback } from 'react';
import { useAuth, useFhirClient, writeAuditEvent } from 'ohs-player-web-core';

/** Params for an audit write, minus the `client` and `agentDisplay` the hook supplies. */
type AuditInput = {
  action: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId?: string;
  description?: string;
};

/**
 * App wrapper around the library `writeAuditEvent` that injects the current FHIR client and the
 * signed-in user as the agent display, so call sites can't forget either (which is how the agent
 * defaulted to "Portal user"). The agent is still a display string, not a `Practitioner` reference —
 * a real actor reference needs a `fhirUser` token claim and is tracked separately.
 */
export function useWriteAudit(): (input: AuditInput) => Promise<unknown> {
  const client = useFhirClient();
  const { user } = useAuth();
  const agentDisplay = user?.preferred_username ?? user?.name ?? user?.email ?? 'Portal user';

  return useCallback(
    (input: AuditInput) => writeAuditEvent(client, { ...input, agentDisplay }),
    [client, agentDisplay],
  );
}
