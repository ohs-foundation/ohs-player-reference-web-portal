import { describe, expect, it, vi } from 'vitest';
import { RESOURCE_TYPES_SYSTEM, writeAuditEvent } from './writeAudit';
import type { FhirClient } from '../client/FhirClient';

function clientStub() {
  const create = vi.fn().mockResolvedValue({ id: 'ae1' });
  return { create } as unknown as FhirClient & { create: ReturnType<typeof vi.fn> };
}

describe('writeAuditEvent', () => {
  it('records the action code (C/U/D) and entity description so the activity feed can show the verb', async () => {
    const client = clientStub();
    await writeAuditEvent(client, {
      action: 'update',
      resourceType: 'Location',
      resourceId: 'l1',
      description: 'Linked to Organization/o1',
    });
    const record = client.create.mock.calls[0][0] as {
      action?: string;
      entity?: { what?: { reference?: string }; description?: string }[];
    };
    expect(record.action).toBe('U');
    expect(record.entity?.[0].what?.reference).toBe('Location/l1');
    expect(record.entity?.[0].description).toBe('Linked to Organization/o1');
  });

  it('maps create→C and delete→D', async () => {
    const client = clientStub();
    await writeAuditEvent(client, { action: 'create', resourceType: 'Organization', resourceId: 'o1' });
    await writeAuditEvent(client, { action: 'delete', resourceType: 'Organization', resourceId: 'o1' });
    expect((client.create.mock.calls[0][0] as { action?: string }).action).toBe('C');
    expect((client.create.mock.calls[1][0] as { action?: string }).action).toBe('D');
  });

  it('writes agent.name so the agent-name search parameter matches the signed-in user', async () => {
    const client = clientStub();
    await writeAuditEvent(client, {
      action: 'update',
      resourceType: 'Location',
      resourceId: 'l1',
      agentDisplay: 'admin-user',
    });
    await writeAuditEvent(client, { action: 'update', resourceType: 'Location', resourceId: 'l1' });
    type Agent = { name?: string; who?: { display?: string }; requestor?: boolean };
    const [named] = (client.create.mock.calls[0][0] as { agent: Agent[] }).agent;
    const [fallback] = (client.create.mock.calls[1][0] as { agent: Agent[] }).agent;
    expect(named).toMatchObject({ name: 'admin-user', who: { display: 'admin-user' }, requestor: true });
    expect(fallback).toMatchObject({ name: 'Portal user', who: { display: 'Portal user' } });
  });

  it('types the entity with its FHIR resource type so the entity-type search parameter matches it', async () => {
    const client = clientStub();
    await writeAuditEvent(client, { action: 'create', resourceType: 'Location', resourceId: 'l1' });
    const record = client.create.mock.calls[0][0] as { entity: { type?: unknown }[] };
    expect(record.entity[0].type).toEqual({
      system: RESOURCE_TYPES_SYSTEM,
      code: 'Location',
      display: 'Location',
    });
    expect(RESOURCE_TYPES_SYSTEM).toBe('http://hl7.org/fhir/resource-types');
  });

  it('omits the entity when no resourceId is given', async () => {
    const client = clientStub();
    await writeAuditEvent(client, { action: 'create', resourceType: 'Bundle' });
    const record = client.create.mock.calls[0][0] as { entity?: unknown[] };
    expect(record.entity).toEqual([]);
  });

  it('propagates the error when the underlying create fails (does not swallow it)', async () => {
    const create = vi.fn().mockRejectedValue(new Error('boom'));
    const client = { create } as unknown as FhirClient;
    await expect(
      writeAuditEvent(client, { action: 'update', resourceType: 'Location', resourceId: 'l1' }),
    ).rejects.toThrow('boom');
  });
});
