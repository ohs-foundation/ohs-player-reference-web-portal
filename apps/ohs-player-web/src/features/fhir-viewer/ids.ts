/**
 * Generate a new FHIR resource id. FHIR ids allow `[A-Za-z0-9\-\.]{1,64}`, so a UUID is both valid
 * and collision-free, which means an add always creates rather than replacing an existing resource.
 * Falls back to a random string where `crypto.randomUUID` is unavailable (older browsers, jsdom).
 */
export function newResourceId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
