import { describe, expect, it } from 'vitest';
import { describeUnknownMessageKeys, unknownMessageKeys } from './unknownMessageKeys';

const declared = new Set(['navUsers', 'navSchedules', 'schedulesTitle', 'schedulesKpi']);

describe('unknownMessageKeys', () => {
  it('passes every key a catalogue declares', () => {
    expect(unknownMessageKeys({ navUsers: 'Staff', navSchedules: 'Rosters' }, declared)).toEqual(
      [],
    );
  });

  it('returns nothing when the document sets no messages', () => {
    expect(unknownMessageKeys(undefined, declared)).toEqual([]);
  });

  it('flags a misspelled key and suggests the declared one', () => {
    expect(unknownMessageKeys({ navSchedles: 'Rosters' }, declared)).toEqual([
      { key: 'navSchedles', suggestion: 'navSchedules' },
    ]);
  });

  it('suggests the declared key for a key that differs only in case', () => {
    expect(unknownMessageKeys({ navschedules: 'Rosters' }, declared)).toEqual([
      { key: 'navschedules', suggestion: 'navSchedules' },
    ]);
  });

  it('flags a key with no near match without a suggestion', () => {
    expect(unknownMessageKeys({ rosterHeading: 'Rosters' }, declared)).toEqual([
      { key: 'rosterHeading' },
    ]);
  });
});

describe('describeUnknownMessageKeys', () => {
  it('names each key and its suggestion', () => {
    expect(
      describeUnknownMessageKeys([
        { key: 'navSchedles', suggestion: 'navSchedules' },
        { key: 'rosterHeading' },
      ]),
    ).toBe(
      'The configuration document\'s messages override keys no catalogue declares, so they have no effect: "navSchedles" (did you mean "navSchedules"?), "rosterHeading".',
    );
  });
});
