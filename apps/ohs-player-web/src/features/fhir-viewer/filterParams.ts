export type ActiveFilter = 'all' | 'active' | 'inactive';
export type SincePreset = 'any' | '24h' | '7d' | '30d';

export const SINCE_PRESETS: readonly SincePreset[] = ['any', '24h', '7d', '30d'];

/** FHIR `_lastUpdated` value (`ge<ISO>`) for a preset, or undefined for "any". */
export function sinceParam(preset: SincePreset): string | undefined {
  if (preset === 'any') return undefined;
  const ms = preset === '24h' ? 86_400_000 : preset === '7d' ? 604_800_000 : 2_592_000_000;
  return `ge${new Date(Date.now() - ms).toISOString()}`;
}
