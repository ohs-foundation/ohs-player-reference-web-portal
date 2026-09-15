import { validatePortalConfig, type PortalConfig } from './portalConfigSchema';

export const PORTAL_CONFIG_FILE = 'portal-config.json';
export const LAST_GOOD_STORAGE_KEY = 'ohs-portal-config';

export type PortalConfigSource = 'document' | 'last-good' | 'baked';

export interface LoadedPortalConfig {
  document?: PortalConfig;
  source: PortalConfigSource;
  error?: string;
}

export interface LoadPortalConfigOptions {
  url?: string;
  fetchDocument?: (url: string) => Promise<Response>;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readLastGood(storage: LoadPortalConfigOptions['storage']): PortalConfig | undefined {
  try {
    const raw = storage?.getItem(LAST_GOOD_STORAGE_KEY);
    if (!raw) return undefined;
    const result = validatePortalConfig(JSON.parse(raw) as unknown);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

function rememberLastGood(
  storage: LoadPortalConfigOptions['storage'],
  document: PortalConfig,
): void {
  try {
    storage?.setItem(LAST_GOOD_STORAGE_KEY, JSON.stringify(document));
  } catch {
    return;
  }
}

function fallback(storage: LoadPortalConfigOptions['storage'], error?: string): LoadedPortalConfig {
  const lastGood = readLastGood(storage);
  return lastGood ? { document: lastGood, source: 'last-good', error } : { source: 'baked', error };
}

export async function loadPortalConfig({
  url = `${import.meta.env.BASE_URL}${PORTAL_CONFIG_FILE}`,
  fetchDocument = (target) => fetch(target, { cache: 'no-cache' }),
  storage = browserStorage(),
}: LoadPortalConfigOptions = {}): Promise<LoadedPortalConfig> {
  let raw: unknown;
  try {
    const response = await fetchDocument(url);
    if (!response.ok) return fallback(storage);
    raw = await response.json();
  } catch {
    return fallback(storage);
  }

  const result = validatePortalConfig(raw);
  if (!result.success) return fallback(storage, result.error);

  rememberLastGood(storage, result.data);
  return { document: result.data, source: 'document' };
}
