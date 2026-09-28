import { describe, expect, it } from 'vitest';
import { importAuditDescription } from './importAudit';

describe('importAuditDescription', () => {
  it('summarises a completed import', () => {
    expect(
      importAuditDescription('orgs.csv', {
        ok: true,
        result: { processed: 48, failed: 2, total: 50, rowErrors: [], outcome: 'continued' },
      }),
    ).toBe('Bulk import of orgs.csv: 48 imported, 2 failed, 50 rows');
  });

  it('names the row a users import stopped at', () => {
    expect(
      importAuditDescription('users.xlsx', {
        ok: true,
        result: {
          processed: 5,
          failed: 1,
          total: null,
          rowErrors: [],
          outcome: 'stopped',
          stoppedAtRow: 6,
        },
      }),
    ).toBe('Bulk import of users.xlsx: 5 imported, 1 failed, unknown rows, stopped at row 6');
  });

  it('records an interrupted import with the rows it wrote', () => {
    expect(
      importAuditDescription('locs.csv', {
        ok: false,
        failure: { kind: 'interrupted', processed: 100, rowErrors: [] },
      }),
    ).toBe('Bulk import of locs.csv ended before completion: 100 imported');
  });
});
