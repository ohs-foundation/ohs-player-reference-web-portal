import type { AuditEvent } from '@medplum/fhirtypes';

const REST = {
  system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
  code: 'rest',
  display: 'RESTful Operation',
};

export const portalUpdate: AuditEvent = {
  resourceType: 'AuditEvent',
  id: 'ae-portal',
  type: REST,
  action: 'U',
  recorded: '2026-09-22T08:30:00.000Z',
  agent: [{ who: { display: 'admin-user' }, name: 'admin-user', requestor: true }],
  source: { observer: { display: 'OHS Player Web' } },
  entity: [
    {
      what: { reference: 'Location/l1' },
      type: { system: 'http://hl7.org/fhir/resource-types', code: 'Location' },
      description: 'Linked to Organization/o1',
    },
  ],
};

export const portalCreateWithoutEntity: AuditEvent = {
  resourceType: 'AuditEvent',
  id: 'ae-no-entity',
  type: REST,
  action: 'C',
  recorded: '2026-09-22T07:00:00.000Z',
  agent: [{ who: { display: 'admin-user' }, requestor: true }],
  source: { observer: { display: 'OHS Player Web' } },
  entity: [],
};

export const gatewaySearch: AuditEvent = {
  resourceType: 'AuditEvent',
  id: 'ae-gateway',
  type: REST,
  subtype: [{ system: 'http://hl7.org/fhir/restful-interaction', code: 'read', display: 'read' }],
  action: 'R',
  recorded: '2026-09-22T06:00:00.000Z',
  outcome: '0',
  agent: [
    { who: { display: 'fhir-gateway' }, requestor: false },
    {
      who: {
        display: 'manager-user',
        identifier: { system: 'http://keycloak/realms/ohs', value: 'sub-123' },
      },
      requestor: true,
    },
  ],
  source: { observer: { display: 'OHS Info Gateway' } },
  entity: [
    { role: { code: '24' }, query: 'TG9jYXRpb24/X2NvdW50PTEw' },
    {
      what: { reference: 'http://hapi:8080/fhir/Organization/o2/_history/4' },
      role: { code: '4' },
    },
  ],
};

export const legacyWithoutAction = {
  resourceType: 'AuditEvent',
  id: 'ae-legacy',
  type: REST,
  agent: [{ who: { display: 'Portal user' }, requestor: true }],
  source: { observer: { display: 'OHS Player Web' } },
  entity: [{ what: { reference: 'Practitioner/p1' } }],
} as unknown as AuditEvent;
