import { SHELL_MESSAGES } from 'ohs-player-web-shell';
import { describe, expect, it } from 'vitest';
import { messages } from './messages';

describe('the example catalogue', () => {
  it('declares only the keys the shell lacks or that the example words differently', () => {
    const catalogue: Readonly<Record<string, string>> = messages;
    const copies = Object.keys(catalogue).filter((key) => SHELL_MESSAGES[key] === catalogue[key]);

    expect(copies).toEqual([]);
    expect(Object.keys(catalogue).sort()).toEqual([
      'appTopbarTitle',
      'pageUsers',
      'pageUsersDescription',
      'rowActions',
    ]);
  });
});
