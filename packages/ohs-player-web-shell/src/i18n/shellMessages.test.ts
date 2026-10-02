import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultMessageCatalog } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVIGATION } from '../config/navigation';
import { builtinWidgets } from '../features/dashboard/widgetCatalogue';
import { gatedKpis } from '../features/dashboard/kpiCatalogue';
import { SHELL_MESSAGES } from './shellMessages';

const SOURCE = join(import.meta.dirname, '..');
const FIRST_ARGUMENT_OF_T = /\bt\(([^,)]*)/g;
const KEY_MAP_BODY = /\bconst [A-Z_]*_KEY\b[^=]*=\s*\{([^}]*)\}/g;
const QUOTED_KEY = /'([a-zA-Z][a-zA-Z0-9]*)'/g;

function literalKeys(): string[] {
  const sources = readdirSync(SOURCE, { encoding: 'utf8', recursive: true })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => readFileSync(join(SOURCE, file), 'utf8'));
  const fragments = sources.flatMap((source) => [
    ...source.matchAll(FIRST_ARGUMENT_OF_T),
    ...source.matchAll(KEY_MAP_BODY),
  ]);
  return fragments.flatMap((fragment) =>
    [...fragment[1].matchAll(QUOTED_KEY)].map((match) => match[1]),
  );
}

function dataKeys(): string[] {
  return [
    ...DEFAULT_NAVIGATION.map((entry) => entry.labelKey),
    ...builtinWidgets(DEFAULT_NAVIGATION).flatMap((entry) => [entry.titleKey, entry.categoryKey]),
    ...gatedKpis(DEFAULT_NAVIGATION).map((kpi) => kpi.entityKey),
    ...['Practitioner', 'Location', 'Organization', 'CareTeam'].map(
      (type) => `resourceType${type}`,
    ),
  ];
}

const declared = (key: string): boolean => key in SHELL_MESSAGES || key in defaultMessageCatalog;

describe('SHELL_MESSAGES', () => {
  it('declares every key the shell passes to t(), so no app has to copy one', () => {
    const keys = [...new Set(literalKeys())];
    expect(keys).toContain('dashboardConfigure');
    expect(keys.filter((key) => !declared(key))).toEqual([]);
  });

  it('declares every key the shell holds as data: sidebar labels, card titles and resource nouns', () => {
    expect(dataKeys().filter((key) => !declared(key))).toEqual([]);
  });

  it('leaves the library catalogue keys to the library', () => {
    expect(Object.keys(SHELL_MESSAGES).filter((key) => key in defaultMessageCatalog)).toEqual([]);
  });
});
