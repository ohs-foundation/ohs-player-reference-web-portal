import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultMessageCatalog } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { messages } from './messages';

const SHELL_SOURCE = '../../packages/ohs-player-web-shell/src';
const FIRST_ARGUMENT_OF_T = /\bt\(([^,)]*)/g;
const KEY_MAP_BODY = /\bconst [A-Z_]*_KEY\b[^=]*=\s*\{([^}]*)\}/g;
const QUOTED_KEY = /'([a-zA-Z][a-zA-Z0-9]*)'/g;

function shellSources(): string[] {
  return readdirSync(SHELL_SOURCE, { encoding: 'utf8', recursive: true })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => readFileSync(join(SHELL_SOURCE, file), 'utf8'));
}

function quotedKeys(fragments: Iterable<RegExpMatchArray>): string[] {
  return [...fragments].flatMap((fragment) =>
    [...fragment[1].matchAll(QUOTED_KEY)].map((match) => match[1]),
  );
}

function shellMessageKeys(): string[] {
  const keys = shellSources().flatMap((source) => [
    ...quotedKeys(source.matchAll(FIRST_ARGUMENT_OF_T)),
    ...quotedKeys(source.matchAll(KEY_MAP_BODY)),
  ]);
  return [...new Set(keys)].sort();
}

describe('the example catalogue', () => {
  it('defines every message key the shell renders, so no screen shows a raw key', () => {
    const keys = shellMessageKeys();
    expect(keys).toContain('activityCreated');
    expect(keys).toContain('tableShowingRange');

    const missing = keys.filter((key) => !(key in messages) && !(key in defaultMessageCatalog));
    expect(missing).toEqual([]);
  });
});
