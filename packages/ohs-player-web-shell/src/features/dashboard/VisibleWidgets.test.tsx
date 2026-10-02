import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NAVIGATION } from '../../config/navigation';
import { builtinWidgets, extensionWidgets } from './widgetCatalogue';

let flagsOff = new Set<string>();
let denied = new Set<string>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useFlag: (flag: string) => !flagsOff.has(flag),
    usePermission: (permission: string) => ({ can: !denied.has(permission) }),
  };
});

const { VisibleWidgets } = await import('./VisibleWidgets');

const load = () => Promise.resolve({ default: () => null });

const catalogue = [
  ...builtinWidgets(DEFAULT_NAVIGATION),
  ...extensionWidgets([
    {
      id: 'schedules.active',
      region: 'kpi',
      order: 50,
      load,
      requires: { flag: 'schedules', permission: 'schedules.view' },
    },
    { id: 'notes.open', region: 'main', order: 60, load },
  ]),
];

function visibleIds(): string[] {
  render(
    <VisibleWidgets catalogue={catalogue}>
      {(visible) => <output>{visible.map((entry) => entry.id).join(' ')}</output>}
    </VisibleWidgets>,
  );
  return (screen.getByRole('status').textContent ?? '').split(' ');
}

describe('VisibleWidgets', () => {
  beforeEach(() => {
    flagsOff = new Set();
    denied = new Set();
  });

  it('keeps every entry the session meets, in catalogue order', () => {
    expect(visibleIds()).toEqual(catalogue.map((entry) => entry.id));
  });

  it('drops every card of a screen whose flag is off', () => {
    flagsOff = new Set(['locationMgmt']);

    const ids = visibleIds();

    expect(ids).toContain('kpi.users');
    expect(ids.filter((id) => id.includes('locations'))).toEqual([]);
  });

  it('drops an extension widget whose permission is denied, and keeps an ungated one', () => {
    denied = new Set(['schedules.view']);
    const ids = visibleIds();

    expect(ids).not.toContain('schedules.active');
    expect(ids).toContain('notes.open');
  });
});
