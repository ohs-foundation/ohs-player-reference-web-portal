import type { TokenStore } from '../types/config';

/** Default browser session storage token store (OIDC state + PKCE). */
export function createSessionStorageTokenStore(): TokenStore {
  return {
    get: (key) => sessionStorage.getItem(key),
    set: (key, value) => {
      sessionStorage.setItem(key, value);
    },
    remove: (key) => {
      sessionStorage.removeItem(key);
    },
  };
}

/** Non-persistent in-memory token store (tests, embedded webviews). */
export function createMemoryTokenStore(): TokenStore {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}
