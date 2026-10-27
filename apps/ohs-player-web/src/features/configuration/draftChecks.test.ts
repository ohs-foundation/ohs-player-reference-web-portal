import { describe, expect, it } from 'vitest';
import { checkDraft } from './draftChecks';

describe('checkDraft', () => {
  it('passes a document the portal host accepts at startup', () => {
    const document = { dashboard: { layout: { kpi: ['kpi.users'], main: ['recent.users'] } } };
    expect(checkDraft(JSON.stringify(document))).toEqual({ kind: 'valid', document });
  });

  it('fails a dashboard id the schema accepts but the host rejects at startup', () => {
    const draft = checkDraft(JSON.stringify({ dashboard: { layout: { kpi: ['kpi.userz'] } } }));

    expect(draft.kind).toBe('invalid');
    expect(draft.kind === 'invalid' && draft.issues[0].message).toContain(
      'dashboard.layout.kpi[0] "kpi.userz" is not a dashboard widget',
    );
  });

  it('fails a card placed in a region it cannot sit in', () => {
    const draft = checkDraft(JSON.stringify({ dashboard: { layout: { side: ['recent.users'] } } }));
    expect(draft.kind === 'invalid' && draft.issues[0].message).toContain('cannot sit in side');
  });

  it('leaves schema failures to the schema', () => {
    expect(checkDraft('{ "flags": { "userMgmt": "yes" } }')).toMatchObject({
      kind: 'invalid',
      issues: [{ path: 'flags.userMgmt' }],
    });
  });
});
