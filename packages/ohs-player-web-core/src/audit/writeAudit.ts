import type { FhirClient } from '../client/FhirClient';

export interface AuditParams {
  action: 'create' | 'update' | 'delete';
  resourceType: string;
  /**
   * Id of the audited resource. Without it, a `description` still records one entity with no
   * `what`, for a summary event that touched many resources (e.g. a bulk import).
   */
  resourceId?: string;
  description?: string;
  agentDisplay?: string;
}

/** Maps the high-level action to the R4 `AuditEvent.action` code (C/R/U/D). */
const ACTION_CODE: Record<AuditParams['action'], 'C' | 'R' | 'U' | 'D'> = {
  create: 'C',
  update: 'U',
  delete: 'D',
};

const ENTITY_TYPE = {
  system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
  code: '2',
  display: 'System Object',
};

function auditEntities(params: AuditParams): Record<string, unknown>[] {
  const description = params.description ? { description: params.description } : {};
  if (params.resourceId) {
    return [
      {
        what: { reference: `${params.resourceType}/${params.resourceId}` },
        type: ENTITY_TYPE,
        ...description,
      },
    ];
  }
  return params.description ? [{ type: ENTITY_TYPE, ...description }] : [];
}

/** Writes a FHIR `AuditEvent` for mutating operations (consumed by the activity feed). */
export async function writeAuditEvent(
  client: FhirClient,
  params: AuditParams,
): Promise<unknown> {
  const now = new Date().toISOString();
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
        who: { display: params.agentDisplay ?? 'Portal user' },
        requestor: true,
      },
    ],
    source: { observer: { display: 'OHS Player Web' } },
    entity: auditEntities(params),
  };

  return client.create(record);
}
