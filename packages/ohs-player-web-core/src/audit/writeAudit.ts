import type { FhirClient } from '../client/FhirClient';

export interface AuditParams {
  action: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId?: string;
  description?: string;
  agentDisplay?: string;
}

/**
 * `AuditEvent.entity.type` system for an audited FHIR resource. The R4 audit-entity-type value set
 * includes every resource type code, so readers can filter with `entity-type=<system>|<Type>`.
 */
export const RESOURCE_TYPES_SYSTEM = 'http://hl7.org/fhir/resource-types';

/** Maps the high-level action to the R4 `AuditEvent.action` code (C/R/U/D). */
const ACTION_CODE: Record<AuditParams['action'], 'C' | 'R' | 'U' | 'D'> = {
  create: 'C',
  update: 'U',
  delete: 'D',
};

/** Writes a FHIR `AuditEvent` for mutating operations (consumed by the activity feed). */
export async function writeAuditEvent(
  client: FhirClient,
  params: AuditParams,
): Promise<unknown> {
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
    entity: params.resourceId
      ? [
          {
            what: { reference: `${params.resourceType}/${params.resourceId}` },
            type: {
              system: RESOURCE_TYPES_SYSTEM,
              code: params.resourceType,
              display: params.resourceType,
            },
            ...(params.description ? { description: params.description } : {}),
          },
        ]
      : [],
  };

  return client.create(record);
}
