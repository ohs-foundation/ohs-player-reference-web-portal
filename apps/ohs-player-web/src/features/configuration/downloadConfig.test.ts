import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { validatePortalConfig } from '../../config/portalConfigSchema';
import { draftText } from './configDraft';
import { diffDocuments } from './documentDiff';
import { downloadAuditDescription, downloadDocument } from './downloadConfig';

const mockSaveFile = vi.fn();
vi.mock('../../lib/saveFile', () => ({
  saveFile: (...args: unknown[]): unknown => mockSaveFile(...args),
}));

function referenceDocument(): unknown {
  return JSON.parse(readFileSync('public/portal-config.json', 'utf8')) as unknown;
}

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('not text'));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(blob);
  });
}

describe('downloadDocument', () => {
  it('saves the document as portal-config.json, readable by the loader', async () => {
    const parsed = validatePortalConfig(referenceDocument());
    if (!parsed.success) throw new Error(parsed.error);

    downloadDocument(parsed.data);

    expect(mockSaveFile).toHaveBeenCalledOnce();
    const [blob, fileName] = mockSaveFile.mock.calls[0] as [Blob, string];
    expect(fileName).toBe('portal-config.json');
    expect(blob.type).toBe('application/json');
    const text = await readText(blob);
    expect(text).toBe(draftText(parsed.data));
    expect(validatePortalConfig(JSON.parse(text) as unknown)).toEqual({
      success: true,
      data: parsed.data,
    });
  });
});

describe('downloadAuditDescription', () => {
  it('names each changed path and says when an assistant proposal is in the file', () => {
    const changes = diffDocuments(
      { locale: 'en', flags: { auditLog: true } },
      { locale: 'sw', flags: { auditLog: false } },
    );

    expect(downloadAuditDescription(changes, false)).toBe(
      'portal-config.json downloaded with 2 changes: locale, flags.auditLog',
    );
    expect(downloadAuditDescription(changes.slice(0, 1), true)).toBe(
      'portal-config.json downloaded with 1 change, including an assistant proposal: locale',
    );
  });

  it('says when the file was downloaded unchanged', () => {
    expect(downloadAuditDescription([], false)).toBe(
      'portal-config.json downloaded with no changes',
    );
  });

  it('lists five paths and counts the rest', () => {
    const before = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((key) => [key, 1]));
    const after = Object.fromEntries(Object.keys(before).map((key) => [key, 2]));

    expect(downloadAuditDescription(diffDocuments(before, after), false)).toBe(
      'portal-config.json downloaded with 7 changes: a, b, c, d, e and 2 more',
    );
  });
});
