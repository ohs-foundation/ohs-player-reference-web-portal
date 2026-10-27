import type { FhirClient } from '../client/FhirClient';

/** A coding for `AuditEvent.entity.type`. */
export interface AuditEntityType {
  system: string;
  code: string;
  display?: string;
}

export interface AuditParams {
  /**
   * `execute` (`E`) records an application function that changes no resource, such as exporting a
   * file.
   */
  action: 'create' | 'update' | 'delete' | 'execute';
  /** FHIR type of the audited resource. Leave it out when `entityType` names something else. */
  resourceType?: string;
  /**
   * Id of the audited resource. Without it, a `description` still records one entity with no
   * `what`, for a summary event that touched many resources (e.g. a bulk import).
   */
  resourceId?: string;
  description?: string;
  agentDisplay?: string;
  /**
   * Types the entity with this coding instead of `resourceType` under {@link RESOURCE_TYPES_SYSTEM},
   * for an entity that is not a FHIR resource. For a configuration file, use
   * {@link AUDIT_ENTITY_TYPE_SYSTEM} code `2`, System Object.
   */
  entityType?: AuditEntityType;
}

/**
 * `AuditEvent.entity.type` system for an audited FHIR resource. The R4 audit-entity-type value set
 * includes every resource type code, so readers can filter with `entity-type=<system>|<Type>`.
 */
export const RESOURCE_TYPES_SYSTEM = 'http://hl7.org/fhir/resource-types';

/**
 * `AuditEvent.entity.type` system for an entity that is not a FHIR resource. The R4
 * audit-entity-type value set is extensible and includes its codes `1` Person, `2` System Object,
 * `3` Organization and `4` Other.
 */
export const AUDIT_ENTITY_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/audit-entity-type';

/** Maps the high-level action to the R4 `AuditEvent.action` code (C/U/D/E). */
const ACTION_CODE: Record<AuditParams['action'], 'C' | 'U' | 'D' | 'E'> = {
  create: 'C',
  update: 'U',
  delete: 'D',
  execute: 'E',
};

function entityCoding({ entityType, resourceType }: AuditParams): AuditEntityType | undefined {
  if (entityType) return entityType;
  return resourceType
    ? { system: RESOURCE_TYPES_SYSTEM, code: resourceType, display: resourceType }
    : undefined;
}

function auditEntities(params: AuditParams): Record<string, unknown>[] {
  const type = entityCoding(params);
  const typed = type ? { type } : {};
  const description = params.description ? { description: params.description } : {};
  if (params.resourceType && params.resourceId) {
    return [
      {
        what: { reference: `${params.resourceType}/${params.resourceId}` },
        ...typed,
        ...description,
      },
    ];
  }
  return params.description ? [{ ...typed, ...description }] : [];
}

/** Writes a FHIR `AuditEvent` for mutating operations (consumed by the activity feed). */
export async function writeAuditEvent(client: FhirClient, params: AuditParams): Promise<unknown> {
  const now = new Date().toISOString();
  const agentDisplay = params.agentDisplay ?? 'Portal user';
  const record = {
    resourceType: 'AuditEvent',
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
      code: 'rest',
      display: 'RESTful Operation',
    },
    action: ACTION_CODE[params.action],
    recorded: now,
    agent: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
              code: 'author',
              display: 'Author',
            },
          ],
        },
        who: { display: agentDisplay },
        name: agentDisplay,
        requestor: true,
      },
    ],
    source: { observer: { display: 'OHS Player Web' } },
    entity: auditEntities(params),
  };

  return client.create(record);
}
