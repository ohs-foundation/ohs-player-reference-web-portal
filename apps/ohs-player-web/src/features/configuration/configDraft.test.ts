import { describe, expect, it } from 'vitest';
import { draftObject, draftText, parseDraft } from './configDraft';

describe('parseDraft', () => {
  it('reports text that is not JSON with the parser detail', () => {
    const draft = parseDraft('{ "flags": ');
    expect(draft.kind).toBe('invalidJson');
    expect(draft.kind === 'invalidJson' && draft.detail).not.toBe('');
  });

  it.each(['[]', '"text"', '42', 'null'])('reports %s as not an object', (text) => {
    expect(parseDraft(text)).toEqual({ kind: 'notAnObject' });
  });

  it('lists the schema issues of an object that fails validation', () => {
    const draft = parseDraft('{ "flags": { "userMgmt": "yes" } }');
    expect(draft).toMatchObject({
      kind: 'invalid',
      value: { flags: { userMgmt: 'yes' } },
      issues: [{ path: 'flags.userMgmt' }],
    });
  });

  it('returns the validated document', () => {
    expect(parseDraft('{ "product": { "name": "Kenya eCHIS" } }')).toEqual({
      kind: 'valid',
      document: { product: { name: 'Kenya eCHIS' } },
    });
  });
});

describe('draftText', () => {
  it('pretty prints with two spaces and a trailing newline', () => {
    expect(draftText({ locale: 'en' })).toBe('{\n  "locale": "en"\n}\n');
  });

  it('round trips through parseDraft', () => {
    const document = { flags: { auditLog: false }, locale: 'sw' };
    expect(parseDraft(draftText(document))).toEqual({ kind: 'valid', document });
  });
});

describe('draftObject', () => {
  it('returns the object of a valid or an invalid draft and nothing otherwise', () => {
    expect(draftObject(parseDraft('{ "locale": "en" }'))).toEqual({ locale: 'en' });
    expect(draftObject(parseDraft('{ "colour": "red" }'))).toEqual({ colour: 'red' });
    expect(draftObject(parseDraft('[1]'))).toBeUndefined();
    expect(draftObject(parseDraft('{'))).toBeUndefined();
  });
});
