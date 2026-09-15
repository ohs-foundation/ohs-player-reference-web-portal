import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePortalConfig } from './src/config/portalConfigSchema';

export const portalConfigFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'public/portal-config.json',
);

export function checkPortalConfigFile(file: string = portalConfigFile): string | undefined {
  if (!existsSync(file)) return undefined;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return `${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`;
  }

  const result = validatePortalConfig(raw);
  return result.success ? undefined : `${file} is invalid:\n${result.error}`;
}
