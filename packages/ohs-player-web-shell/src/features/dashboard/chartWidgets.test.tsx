import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NAVIGATION } from '../../config/navigation';

type Params = Record<string, string | readonly string[]>;

let state: 'data' | 'zero' | 'loading' | 'error' = 'data';
let flagsOff = new Set<string>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      locale: 'en',
      formatNumber: (n: number) => String(n),
    }),
    useFlag: (flag: string) => !flagsOff.has(flag),
    usePermission: () => ({ can: true }),
    useSearch: (_resourceType: string, params: Params) => {
      if (state === 'loading') return { data: undefined, isLoading: true, error: null };
      if (state === 'error') return { data: undefined, isLoading: false, error: new Error('down') };
      const total = state === 'zero' ? 0 : params.active || params.status ? 3 : 4;
      return { data: { total }, isLoading: false, error: null };
    },
  };
});

const { builtinWidgets } = await import('./widgetCatalogue');

function renderWidget(id: string) {
  const entry = builtinWidgets(DEFAULT_NAVIGATION).find((widget) => widget.id === id);
  if (!entry) throw new Error(`no widget ${id}`);
  return render(<>{entry.render()}</>);
}

describe('chart widgets', () => {
  beforeEach(() => {
    state = 'data';
    flagsOff = new Set();
  });

  it('draws six months of updates with a table alternative', async () => {
    const { container } = renderWidget('chart.updatedByMonth.users');

    expect(screen.getByRole('heading', { name: 'chartUpdatedByMonthUsers' })).toBeInTheDocument();
    expect(container.querySelectorAll('.ohs-bar-chart__bar')).toHaveLength(6);
    const table = screen.getByRole('table', { name: 'chartUpdatedByMonthUsers' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(
      within(table).getByRole('columnheader', { name: 'chartRecordsUpdated' }),
    ).toBeInTheDocument();
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });

  it.each([
    ['zero', 'chartEmpty'],
    ['error', 'down'],
  ] as const)('shows the %s state instead of the bars', (next, text) => {
    state = next;
    const { container } = renderWidget('chart.updatedByMonth.locations');

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(container.querySelector('.ohs-bar-chart')).toBeNull();
  });

  it('shows a spinner while any month loads', () => {
    state = 'loading';
    const { container } = renderWidget('chart.updatedByMonth.careTeams');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelector('.ohs-bar-chart')).toBeNull();
  });

  it('shares active against inactive for each entity the session can see', () => {
    flagsOff = new Set(['careTeams']);
    renderWidget('chart.activeShare');

    const table = screen.getByRole('table', { name: 'chartActiveShare' });
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent),
    ).toEqual([
      'chartRecordTypestatusActivestatusInactive',
      'navUsers31',
      'navLocations31',
      'navOrganizations31',
    ]);
  });

  it('shows the empty state when no entity has a record', () => {
    state = 'zero';
    renderWidget('chart.activeShare');

    expect(screen.getByText('chartEmpty')).toBeInTheDocument();
  });

  it('keeps the bars in token colours', () => {
    const { container } = renderWidget('chart.activeShare');

    const colours = [...container.querySelectorAll<HTMLElement>('.ohs-stacked-bar__segment')].map(
      (segment) => segment.style.background,
    );
    expect(new Set(colours)).toEqual(
      new Set(['var(--ohs-sys-color-success)', 'var(--ohs-sys-color-outline)']),
    );
  });
});
