import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCsv, csvTextFromBytes, prepareUpload, readBytes } from './importFile';
import { locationTemplate, organizationTemplate, userTemplate } from './importTemplates';

const fixture = (name: string): File =>
  new File([readFileSync(resolve(__dirname, '__fixtures__', name))], name);

const csvFile = (content: string, name = 'import.csv'): File =>
  new File([content], name, { type: 'text/csv' });

const bytesOf = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer;

describe('csvTextFromBytes', () => {
  it('strips a UTF-8 byte order mark and normalises CRLF', () => {
    expect(csvTextFromBytes(bytesOf('﻿name,id\r\nKenya,\r\n'))).toEqual({
      ok: true,
      text: 'name,id\nKenya,\n',
    });
  });

  it('rejects bytes that are not UTF-8', () => {
    expect(csvTextFromBytes(new Uint8Array([0x6e, 0x61, 0xe9, 0x0a]).buffer)).toEqual({
      ok: false,
      problem: { kind: 'notUtf8' },
    });
  });

  it('rejects a workbook saved with a .csv name', () => {
    expect(csvTextFromBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]).buffer)).toEqual({
      ok: false,
      problem: { kind: 'workbookAsCsv' },
    });
  });
});

describe('checkCsv', () => {
  it('accepts required columns in any order with extra columns', () => {
    expect(checkCsv('notes,name\nx,Kenya\n', locationTemplate, 'csv')).toEqual({
      ok: true,
      text: 'notes,name\nx,Kenya\n',
    });
  });

  it('lists every missing required column, matching case like the backend', () => {
    expect(checkCsv('Username,EMAIL\njdoe,j@x.org\n', userTemplate, 'csv')).toEqual({
      ok: false,
      problem: { kind: 'missingColumns', columns: ['username', 'email'] },
    });
  });

  it('rejects a quoted CSV cell with its line number', () => {
    expect(
      checkCsv('name,physical_address\nMOH,"Afya House, Nairobi"\n', organizationTemplate, 'csv'),
    ).toEqual({
      ok: false,
      problem: { kind: 'quotedCsv', line: 2 },
    });
  });

  it('rejects a header with no data rows and drops trailing blank lines', () => {
    expect(checkCsv('name\n\n\n', locationTemplate, 'csv')).toEqual({
      ok: false,
      problem: { kind: 'noRows' },
    });
    expect(checkCsv('name\nKenya\n\n\n', locationTemplate, 'csv')).toEqual({
      ok: true,
      text: 'name\nKenya\n',
    });
  });
});

describe('prepareUpload', () => {
  it('turns a CSV into the checked text it will upload', async () => {
    const prepared = await prepareUpload(csvFile('﻿name\r\nKenya\r\n'), locationTemplate);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.file.name).toBe('import.csv');
      expect(new TextDecoder().decode(await readBytes(prepared.file))).toBe('name\nKenya\n');
    }
  });

  it('serialises the first sheet of a valid workbook to the same rows as its CSV twin', async () => {
    const prepared = await prepareUpload(fixture('valid-organizations.xlsx'), organizationTemplate);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.file.name).toBe('valid-organizations.csv');
      expect(new TextDecoder().decode(await readBytes(prepared.file))).toBe(
        [
          'id,name,source_id,is_team,parent_id,parent_name,source_parent_id,phone,email,physical_address,postal_address',
          ',Ministry of Health,MOH,false,,,,254200000000,info@health.example.org,Afya House Nairobi,PO Box 30016 Nairobi',
          ',Nairobi Health Team,NHT,true,,,MOH,,,,',
          '',
        ].join('\n'),
      );
    }
  });

  it('sends a users dob date cell as YYYY-MM-DD', async () => {
    const prepared = await prepareUpload(fixture('users-dob.xlsx'), userTemplate);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      const [, row] = new TextDecoder().decode(await readBytes(prepared.file)).split('\n');
      expect(row).toBe(
        ',jdoe,Jane,Doe,jane.doe@example.org,,,true,1990-04-12,female,12345678,+254700000001,HR-001',
      );
    }
  });

  it('rejects a workbook whose header misses a required column', async () => {
    expect(await prepareUpload(fixture('wrong-header.xlsx'), organizationTemplate)).toEqual({
      ok: false,
      problem: { kind: 'missingColumns', columns: ['name'] },
    });
  });

  it('rejects a workbook cell containing a comma', async () => {
    expect(await prepareUpload(fixture('comma-cell.xlsx'), organizationTemplate)).toEqual({
      ok: false,
      problem: { kind: 'unsupportedCell', row: 2, column: 'physical_address' },
    });
  });

  it('rejects a file that is not a spreadsheet', async () => {
    expect(await prepareUpload(fixture('not-a-spreadsheet.txt'), locationTemplate)).toEqual({
      ok: false,
      problem: { kind: 'fileType' },
    });
    const renamed = new File(
      [readFileSync(resolve(__dirname, '__fixtures__', 'not-a-spreadsheet.txt'))],
      'fake.xlsx',
    );
    expect(await prepareUpload(renamed, locationTemplate)).toEqual({
      ok: false,
      problem: { kind: 'unreadable' },
    });
    expect(await prepareUpload(csvFile('x', 'legacy.xls'), locationTemplate)).toEqual({
      ok: false,
      problem: { kind: 'fileType' },
    });
  });

  it('rejects a file over the size limit before reading it', async () => {
    const big = csvFile('name\n');
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 });
    expect(await prepareUpload(big, locationTemplate)).toEqual({
      ok: false,
      problem: { kind: 'tooLarge', maxMegabytes: 50 },
    });
  });
});
