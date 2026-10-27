import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validatePortalConfig } from '../../config/portalConfigSchema';
import { draftText } from './configDraft';
import { diffDocuments } from './documentDiff';
import { downloadAuditDescription, downloadDocument } from './downloadConfig';

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
  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  it('saves the document as portal-config.json and releases the object URL', async () => {
    const parsed = validatePortalConfig(referenceDocument());
    if (!parsed.success) throw new Error(parsed.error);
    let saved: Blob | undefined;
    const revokeObjectURL = vi.fn();
    Object.assign(URL, {
      createObjectURL: (blob: Blob) => {
        saved = blob;
        return 'blob:config';
      },
      revokeObjectURL,
    });
    const clicked: { download: string; href: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ download: this.download, href: this.getAttribute('href') ?? '' });
    });

    downloadDocument(parsed.data);

    expect(clicked).toEqual([{ download: 'portal-config.json', href: 'blob:config' }]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:config');
    if (!saved) throw new Error('nothing was saved');
    const text = await readText(saved);
    expect(text).toBe(draftText(parsed.data));
    expect(validatePortalConfig(JSON.parse(text) as unknown)).toEqual({
      success: true,
      data: parsed.data,
    });
  });
});

describe('downloadAuditDescription', () => {
  it('names each changed path and says who proposed them', () => {
    const changes = diffDocuments(
      { locale: 'en', flags: { auditLog: true } },
      { locale: 'sw', flags: { auditLog: false } },
    );

    expect(downloadAuditDescription(changes, false)).toBe(
      'portal-config.json downloaded with 2 changes: locale, flags.auditLog',
    );
    expect(downloadAuditDescription(changes.slice(0, 1), true)).toBe(
      'portal-config.json downloaded with 1 change proposed by the assistant: locale',
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
