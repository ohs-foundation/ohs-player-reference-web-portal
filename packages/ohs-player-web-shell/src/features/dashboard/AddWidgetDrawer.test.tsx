import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_NAVIGATION } from '../../config/navigation';
import { builtinWidgets, extensionWidgets } from './widgetCatalogue';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, string | number>) =>
        vars ? [key, ...Object.values(vars)].join(' ') : key,
    }),
  };
});

const { AddWidgetDrawer } = await import('./AddWidgetDrawer');

const load = () => Promise.resolve({ default: () => null });

function headings(entries: Parameters<typeof AddWidgetDrawer>[0]['entries']): string[] {
  render(
    <AddWidgetDrawer
      open
      onClose={vi.fn()}
      entries={entries}
      placed={new Set()}
      atKpiCap={false}
      onAdd={vi.fn()}
    />,
  );
  const drawer = screen.getByRole('dialog');
  return within(drawer)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '');
}

describe('AddWidgetDrawer', () => {
  it('groups extension widgets under their manifest after the built in categories', () => {
    const entries = [
      ...builtinWidgets(DEFAULT_NAVIGATION).filter((entry) => entry.kind === 'kpi'),
      ...extensionWidgets([{ id: 'schedules.active', region: 'kpi', order: 50, load }]),
    ];

    expect(headings(entries)).toEqual(['widgetCategoryKpi', 'schedules']);
    expect(screen.getByRole('button', { name: 'widgetAddNamed schedules.active' })).toBeEnabled();
  });

  it('lists an extension widget whose category matches a built in one in the same group', () => {
    const [kpi] = builtinWidgets(DEFAULT_NAVIGATION);
    const [extension] = extensionWidgets([{ id: 'practice.late', region: 'kpi', order: 50, load }]);

    expect(headings([kpi, { ...extension, categoryKey: 'widgetCategoryKpi' }])).toEqual([
      'widgetCategoryKpi',
    ]);
  });
});
