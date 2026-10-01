import { describe, expect, it } from 'vitest';
import { activityItemFromAuditEvent } from './auditActivity';

const portalEvent = {
  resourceType: 'AuditEvent',
  id: 'ae1',
  action: 'U',
  recorded: '2026-09-22T08:30:00.000Z',
  agent: [{ who: { display: 'admin-user' }, requestor: true }],
  entity: [{ what: { reference: 'Location/l1' }, description: 'Linked to Organization/o1' }],
};

const gatewayEvent = {
  resourceType: 'AuditEvent',
  id: 'ae2',
  action: 'E',
  recorded: '2026-09-22T09:00:00.000Z',
  agent: [
    { who: { display: 'fhir-gateway' }, requestor: false },
    { who: { display: 'ohs-web' }, requestor: false },
    {
      who: { display: 'manager-user', identifier: { system: 'http://kc/realms/ohs', value: 'sub-1' } },
      requestor: true,
    },
  ],
  entity: [
    { role: { code: '24' }, query: 'TG9jYXRpb24/X2NvdW50PTEw' },
    { what: { reference: 'http://hapi:8080/fhir/Location/l2/_history/3' }, role: { code: '4' } },
  ],
};

describe('activityItemFromAuditEvent', () => {
  it('normalises a portal-written event to the shape the activity feed shows', () => {
    expect(activityItemFromAuditEvent(portalEvent)).toEqual({
      id: 'ae1',
      action: 'U',
      resourceType: 'Location',
      resourceId: 'l1',
      description: 'Linked to Organization/o1',
      who: 'admin-user',
      recorded: '2026-09-22T08:30:00.000Z',
    });
  });

  it('reads a gateway BALP event: requestor agent, data entity (not the query entity), no verb for E', () => {
    expect(activityItemFromAuditEvent(gatewayEvent)).toMatchObject({
      id: 'ae2',
      action: undefined,
      resourceType: 'Location',
      resourceId: 'l2',
      who: 'manager-user',
    });
  });

  it('prefers agent.name over who.display', () => {
    const event = { ...portalEvent, agent: [{ name: 'Jane Admin', who: { display: 'jadmin' }, requestor: true }] };
    expect(activityItemFromAuditEvent(event).who).toBe('Jane Admin');
  });

  it('falls back to the first agent when none is the requestor', () => {
    const event = { ...portalEvent, agent: [{ who: { display: 'first' } }, { who: { display: 'second' } }] };
    expect(activityItemFromAuditEvent(event).who).toBe('first');
  });

  it.each([
    ['Location/l1', 'Location', 'l1'],
    ['Location/l1/_history/2', 'Location', 'l1'],
    ['https://host/fhir/Organization/o-9', 'Organization', 'o-9'],
    ['l1', '', ''],
    ['#contained', '', ''],
    ['http://host/fhir', '', ''],
  ])('parses the entity reference %s', (reference, resourceType, resourceId) => {
    const item = activityItemFromAuditEvent({ ...portalEvent, entity: [{ what: { reference } }] });
    expect(item).toMatchObject({ resourceType, resourceId });
  });

  it('builds a fallback id and empty resource when there is no id and no entity', () => {
    const item = activityItemFromAuditEvent({
      resourceType: 'AuditEvent',
      action: 'C',
      recorded: '2026-09-22T08:30:00.000Z',
      agent: [{ who: { display: 'admin-user' }, requestor: true }],
      entity: [],
    });
    expect(item).toMatchObject({ id: '//2026-09-22T08:30:00.000Z', resourceType: '', resourceId: '' });
  });

  it.each(['X', 'E', undefined, 3])('reads action %s as no verb', (action) => {
    expect(activityItemFromAuditEvent({ ...portalEvent, action }).action).toBeUndefined();
  });

  it.each([null, undefined, 'AuditEvent', 42, {}, { agent: 'x', entity: [null, 'y'] }])(
    'returns an empty item for malformed input %s without throwing',
    (input) => {
      expect(activityItemFromAuditEvent(input)).toEqual({
        id: '//',
        action: undefined,
        resourceType: '',
        resourceId: '',
        description: undefined,
        who: '',
        recorded: undefined,
      });
    },
  );
});
