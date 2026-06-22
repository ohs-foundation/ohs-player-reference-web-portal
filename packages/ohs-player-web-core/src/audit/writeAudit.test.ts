import { describe, expect, it, vi } from 'vitest';
import { writeAuditEvent } from './writeAudit';
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
