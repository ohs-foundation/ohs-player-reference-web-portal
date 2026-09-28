import { describe, expect, it } from 'vitest';
import { cellText, rowsToCsv } from './workbookToCsv';

describe('cellText', () => {
  it('writes numbers without exponent or grouping', () => {
    expect(cellText(254700000001)).toBe('254700000001');
    expect(cellText(1e21)).toBe('1000000000000000000000');
    expect(cellText(-1.286389)).toBe('-1.286389');
    expect(cellText(0.0000001)).toBe('0.0000001');
  });

  it('writes a date cell as YYYY-MM-DD from its UTC fields', () => {
    expect(cellText(new Date(Date.UTC(1990, 3, 12)))).toBe('1990-04-12');
  });

  it('writes booleans and empty cells', () => {
    expect(cellText(true)).toBe('true');
    expect(cellText(false)).toBe('false');
    expect(cellText(null)).toBe('');
    expect(cellText(undefined)).toBe('');
  });
});

describe('rowsToCsv', () => {
  it('drops trailing empty rows and keeps a blank middle row as an empty line', () => {
    expect(
      rowsToCsv([
        ['name', 'is_team'],
        ['Ministry of Health', false],
        [null, null],
        ['Team', true],
        [null, ''],
        [],
      ]),
    ).toEqual({ ok: true, text: 'name,is_team\nMinistry of Health,false\n\nTeam,true\n' });
  });

  it('rejects a cell holding a comma, naming the sheet row and the column', () => {
    expect(
      rowsToCsv([
        ['name', 'physical_address'],
        ['MOH', 'Afya House, Nairobi'],
      ]),
    ).toEqual({
      ok: false,
      problem: { kind: 'unsupportedCell', row: 2, column: 'physical_address' },
    });
  });

  it('rejects line breaks and falls back to the column letter for an unnamed column', () => {
    expect(rowsToCsv([['name'], ['MOH', 'line one\nline two']])).toEqual({
      ok: false,
      problem: { kind: 'unsupportedCell', row: 2, column: 'B' },
    });
    expect(rowsToCsv([['name'], ['a\rb']])).toEqual({
      ok: false,
      problem: { kind: 'unsupportedCell', row: 2, column: 'name' },
    });
  });

  it('reports an empty sheet as having no rows', () => {
    expect(rowsToCsv([])).toEqual({ ok: false, problem: { kind: 'noRows' } });
    expect(rowsToCsv([[null], []])).toEqual({ ok: false, problem: { kind: 'noRows' } });
  });
});
