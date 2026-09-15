import { describe, expect, it, vi } from 'vitest';
import { LAST_GOOD_STORAGE_KEY, loadPortalConfig } from './loadPortalConfig';

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string): string | null => items.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      items.set(key, value);
    },
  };
}

const answering =
  (body: string, status = 200) =>
  () =>
    Promise.resolve(new Response(body, { status }));

const validDocument = { product: { name: 'County Health' }, flags: { userMgmt: false } };
const invalidDocument = { flags: { userMgmt: 'yes' } };

describe('loadPortalConfig', () => {
  it('requests the document served next to the bundle', async () => {
    const fetchDocument = vi.fn(answering(JSON.stringify(validDocument)));

    await loadPortalConfig({ fetchDocument, storage: memoryStorage() });

    expect(fetchDocument).toHaveBeenCalledWith('/portal-config.json');
  });

  it('uses a valid document and remembers it as the last good copy', async () => {
    const storage = memoryStorage();

    const loaded = await loadPortalConfig({
      fetchDocument: answering(JSON.stringify(validDocument)),
      storage,
    });

    expect(loaded).toEqual({ document: validDocument, source: 'document' });
    expect(JSON.parse(storage.items.get(LAST_GOOD_STORAGE_KEY) ?? '')).toEqual(validDocument);
  });

  it('falls back to the baked values with an error naming the field when the document is invalid', async () => {
    const storage = memoryStorage();

    const loaded = await loadPortalConfig({
      fetchDocument: answering(JSON.stringify(invalidDocument)),
      storage,
    });

    expect(loaded.source).toBe('baked');
    expect(loaded.document).toBeUndefined();
    expect(loaded.error).toMatch(/expected boolean[\s\S]*flags\.userMgmt/);
    expect(storage.items.has(LAST_GOOD_STORAGE_KEY)).toBe(false);
  });

  it('falls back to the last good copy when the document is invalid', async () => {
    const storage = memoryStorage({ [LAST_GOOD_STORAGE_KEY]: JSON.stringify(validDocument) });

    const loaded = await loadPortalConfig({
      fetchDocument: answering(JSON.stringify(invalidDocument)),
      storage,
    });

    expect(loaded.source).toBe('last-good');
    expect(loaded.document).toEqual(validDocument);
    expect(loaded.error).toContain('flags.userMgmt');
  });

  it('falls back to the baked values, without an error, when the fetch fails', async () => {
    const loaded = await loadPortalConfig({
      fetchDocument: () => Promise.reject(new TypeError('Failed to fetch')),
      storage: memoryStorage(),
    });

    expect(loaded).toEqual({ source: 'baked', error: undefined });
  });

  it('treats a missing or non-JSON document as a failed fetch', async () => {
    for (const fetchDocument of [answering('Not found', 404), answering('<!doctype html>')]) {
      expect(await loadPortalConfig({ fetchDocument, storage: memoryStorage() })).toEqual({
        source: 'baked',
        error: undefined,
      });
    }
  });

  it('uses the last good copy during an outage', async () => {
    const loaded = await loadPortalConfig({
      fetchDocument: () => Promise.reject(new TypeError('Failed to fetch')),
      storage: memoryStorage({ [LAST_GOOD_STORAGE_KEY]: JSON.stringify(validDocument) }),
    });

    expect(loaded).toEqual({ document: validDocument, source: 'last-good', error: undefined });
  });

  it('ignores a stored copy that no longer validates', async () => {
    const loaded = await loadPortalConfig({
      fetchDocument: () => Promise.reject(new TypeError('Failed to fetch')),
      storage: memoryStorage({ [LAST_GOOD_STORAGE_KEY]: JSON.stringify({ colour: 'red' }) }),
    });

    expect(loaded.source).toBe('baked');
  });
});
