const RELEASE_DELAY_MS = 40_000;

export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari cancels a download whose object URL is revoked in the same task as the click.
  window.setTimeout(() => URL.revokeObjectURL(url), RELEASE_DELAY_MS);
}
