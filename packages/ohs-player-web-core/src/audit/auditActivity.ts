/** `AuditEvent.action` codes a list names with a verb; `E` (execute) stays generic. */
export type AuditAction = 'C' | 'R' | 'U' | 'D';

/** One `AuditEvent` normalised for lists: the requesting agent, the audited resource, the verb. */
export interface ActivityItem {
  /** `AuditEvent.id`, else `Type/id/recorded`. */
  id: string;
  /** `AuditEvent.action` when it is C, R, U or D; `undefined` for `E` or a missing action. */
  action?: AuditAction;
  /** Type of the audited resource, e.g. `'Location'`; `''` when the event names none. */
  resourceType: string;
  /** Id of the audited resource; `''` when the event names none. */
  resourceId: string;
  /** `entity.description` of the audited resource. */
  description?: string;
  /** The requesting agent: `agent.name`, else `agent.who.display`; `''` when neither is set. */
  who: string;
  /** `AuditEvent.recorded` (ISO instant). */
  recorded?: string;
}

interface AgentShape {
  name?: unknown;
  requestor?: unknown;
  who?: { display?: unknown } | null;
}

interface EntityShape {
  what?: { reference?: unknown } | null;
  description?: unknown;
}

interface AuditEventShape {
  id?: unknown;
  action?: unknown;
  recorded?: unknown;
  agent?: unknown;
  entity?: unknown;
}

// The trailing `Type/id`, so relative, absolute and versioned references all resolve.
const ENTITY_REFERENCE = /(?:^|\/)([A-Z][A-Za-z]+)\/([^/]+)(?:\/_history\/[^/]+)?$/;

const AUDIT_ACTIONS: readonly string[] = ['C', 'R', 'U', 'D'];

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function records<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((v): v is T => typeof v === 'object' && v !== null)
    : [];
}

function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === 'string' && AUDIT_ACTIONS.includes(value);
}

function parseReference(reference: unknown): { resourceType: string; resourceId: string } | undefined {
  const match = typeof reference === 'string' ? ENTITY_REFERENCE.exec(reference) : null;
  return match ? { resourceType: match[1], resourceId: match[2] } : undefined;
}

function requestingAgent(agents: AgentShape[]): AgentShape | undefined {
  return agents.find((agent) => agent.requestor === true) ?? agents[0];
}

function auditedEntity(entities: EntityShape[]): {
  entity?: EntityShape;
  resourceType: string;
  resourceId: string;
} {
  for (const entity of entities) {
    const reference = parseReference(entity.what?.reference);
    if (reference) return { entity, ...reference };
  }
  return { entity: entities[0], resourceType: '', resourceId: '' };
}

/**
 * Normalises a FHIR R4 `AuditEvent`, portal written or gateway (IHE BALP) written, to an
 * {@link ActivityItem}. Picks the `requestor` agent (else the first) and the first entity whose
 * `what.reference` ends in `Type/id`, which skips BALP query entities. Never throws on malformed input.
 */
export function activityItemFromAuditEvent(resource: unknown): ActivityItem {
  const event: AuditEventShape = typeof resource === 'object' && resource !== null ? resource : {};
  const agent = requestingAgent(records<AgentShape>(event.agent));
  const { entity, resourceType, resourceId } = auditedEntity(records<EntityShape>(event.entity));
  const recorded = text(event.recorded);
  return {
    id: text(event.id) ?? `${resourceType}/${resourceId}/${recorded ?? ''}`,
    action: isAuditAction(event.action) ? event.action : undefined,
    resourceType,
    resourceId,
    description: text(entity?.description),
    who: text(agent?.name) ?? text(agent?.who?.display) ?? '',
    recorded,
  };
}
