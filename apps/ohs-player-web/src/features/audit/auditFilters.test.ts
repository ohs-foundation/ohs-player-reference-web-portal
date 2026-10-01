import { afterEach, describe, expect, it } from 'vitest';
import {
  type AuditFilters,
  auditSearchParams,
  isAuditAction,
  isIsoDate,
  isRangeInverted,
  isResourceTypeName,
  localDayStart,
  nextLocalDayStart,
} from './auditFilters';

const NONE: AuditFilters = { action: null, resourceType: null, agent: null, from: null, to: null };
const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe('audit date bounds', () => {
  it.each([
    ['Africa/Nairobi', '2026-09-21T21:00:00.000Z', '2026-09-22T21:00:00.000Z'],
    ['America/Los_Angeles', '2026-09-22T07:00:00.000Z', '2026-09-23T07:00:00.000Z'],
    ['UTC', '2026-09-22T00:00:00.000Z', '2026-09-23T00:00:00.000Z'],
  ])('uses local midnights in %s', (zone, start, nextStart) => {
    process.env.TZ = zone;
    expect(localDayStart('2026-09-22')).toBe(start);
    expect(nextLocalDayStart('2026-09-22')).toBe(nextStart);
  });

  it('crosses month and year ends', () => {
    process.env.TZ = 'UTC';
    expect(nextLocalDayStart('2026-12-31')).toBe('2027-01-01T00:00:00.000Z');
    expect(nextLocalDayStart('2028-02-28')).toBe('2028-02-29T00:00:00.000Z');
  });

  it.each(['2026-13-40', '2026-02-30', 'not-a-date', '2026-9-1', '0002-01-01', ''])(
    'rejects %s as a calendar date',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
      expect(localDayStart(value)).toBeUndefined();
    },
  );

  it('detects an inverted range only when both ends are dates', () => {
    expect(isRangeInverted('2026-09-22', '2026-09-01')).toBe(true);
    expect(isRangeInverted('2026-09-01', '2026-09-01')).toBe(false);
    expect(isRangeInverted('2026-09-22', null)).toBe(false);
    expect(isRangeInverted('garbage', '2026-09-01')).toBe(false);
  });
});

describe('audit filter guards', () => {
  it.each([
    ['Location', true],
    ['PractitionerRole', true],
    ['location', false],
    ['1abc', false],
    ['Location/1', false],
    [null, false],
  ])('treats %s as a resource type name: %s', (value, expected) => {
    expect(isResourceTypeName(value)).toBe(expected);
  });

  it.each([
    ['C', true],
    ['D', true],
    ['E', false],
    ['Z', false],
    [null, false],
  ])('treats %s as an audit action: %s', (value, expected) => {
    expect(isAuditAction(value)).toBe(expected);
  });
});

describe('auditSearchParams', () => {
  it('always sorts newest first, and sends nothing else without filters', () => {
    expect(auditSearchParams(NONE)).toEqual({ _sort: '-date' });
  });

  it('maps every filter to its FHIR search parameter', () => {
    process.env.TZ = 'Africa/Nairobi';
    expect(
      auditSearchParams({
        action: 'U',
        resourceType: 'Location',
        agent: '  adm ',
        from: '2026-09-01',
        to: '2026-09-22',
      }),
    ).toEqual({
      _sort: '-date',
      action: 'U',
      'entity-type': 'http://hl7.org/fhir/resource-types|Location',
      'agent-name': 'adm',
      date: ['ge2026-08-31T21:00:00.000Z', 'lt2026-09-22T21:00:00.000Z'],
    });
  });

  it('sends a single bound for an open-ended range', () => {
    process.env.TZ = 'UTC';
    expect(auditSearchParams({ ...NONE, from: '2026-09-01' }).date).toEqual([
      'ge2026-09-01T00:00:00.000Z',
    ]);
    expect(auditSearchParams({ ...NONE, to: '2026-09-01' }).date).toEqual([
      'lt2026-09-02T00:00:00.000Z',
    ]);
  });

  it('drops an inverted range, invalid dates, a bad type name and a blank agent', () => {
    expect(
      auditSearchParams({
        action: null,
        resourceType: '1abc',
        agent: '   ',
        from: '2026-09-22',
        to: '2026-09-01',
      }),
    ).toEqual({ _sort: '-date' });
    expect(auditSearchParams({ ...NONE, from: 'not-a-date', to: '2026-13-40' })).toEqual({
      _sort: '-date',
    });
  });
});
