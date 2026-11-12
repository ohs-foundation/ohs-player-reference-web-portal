import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveFile } from './saveFile';

describe('saveFile', () => {
  const revokeObjectURL = vi.fn();
  const clicks: { download: string; href: string; inPage: boolean }[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    clicks.length = 0;
    revokeObjectURL.mockReset();
    Object.assign(URL, { createObjectURL: () => 'blob:file', revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push({
        download: this.download,
        href: this.getAttribute('href') ?? '',
        inPage: document.body.contains(this),
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('clicks a link in the page that saves the blob under the file name', () => {
    saveFile(new Blob(['a,b\n']), 'users-template.csv');

    expect(clicks).toEqual([{ download: 'users-template.csv', href: 'blob:file', inPage: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('releases the object URL only after the click has had time to start the download', () => {
    saveFile(new Blob(['{}']), 'portal-config.json');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:file');
  });
});
