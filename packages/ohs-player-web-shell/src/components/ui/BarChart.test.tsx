import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ formatNumber: (n: number) => n.toLocaleString('en') }),
  };
});

const { BarChart } = await import('./BarChart');
const { StackedBar } = await import('./StackedBar');

const points = [
  { label: 'May', value: 0 },
  { label: 'Jun', value: 4 },
  { label: 'Jul', value: 1200 },
];

describe('BarChart', () => {
  it('draws one column per non zero point and a track under every point', () => {
    const { container } = render(
      <BarChart
        points={points}
        ariaLabel="Users updated"
        labelHeader="Month"
        valueHeader="Count"
      />,
    );

    expect(container.querySelectorAll('.ohs-bar-chart__track')).toHaveLength(3);
    expect(container.querySelectorAll('.ohs-bar-chart__bar')).toHaveLength(2);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('colours columns with a token and keeps text in the ink classes', () => {
    const { container } = render(
      <BarChart
        points={points}
        ariaLabel="Users updated"
        labelHeader="Month"
        valueHeader="Count"
        color="var(--ohs-sys-color-tertiary)"
      />,
    );

    const bar = container.querySelector<SVGPathElement>('.ohs-bar-chart__bar');
    expect(bar?.style.fill).toBe('var(--ohs-sys-color-tertiary)');
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('carries every label and formatted value in the table alternative', () => {
    render(
      <BarChart
        points={points}
        ariaLabel="Users updated"
        labelHeader="Month"
        valueHeader="Count"
      />,
    );

    const table = screen.getByRole('table', { name: 'Users updated' });
    const rows = within(table)
      .getAllByRole('row')
      .map((row) => row.textContent);
    expect(rows).toEqual(['MonthCount', 'May0', 'Jun4', 'Jul1,200']);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <BarChart
        points={points}
        ariaLabel="Users updated"
        labelHeader="Month"
        valueHeader="Count"
      />,
    );

    expect(
      (await axe(container, { rules: { 'color-contrast': { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe('StackedBar', () => {
  const segments = (active: number, inactive: number) => [
    { label: 'Active', value: active, color: 'var(--ohs-sys-color-success)' },
    { label: 'Inactive', value: inactive, color: 'var(--ohs-sys-color-outline-variant)' },
  ];
  const rows = [
    { label: 'Users', segments: segments(7, 3) },
    { label: 'Care teams', segments: segments(0, 0) },
  ];

  it('splits each row by share, skips empty segments and shows the first share', () => {
    const { container } = render(
      <StackedBar rows={rows} ariaLabel="Active share" labelHeader="Entity" />,
    );

    const [users, careTeams] = container.querySelectorAll('.ohs-stacked-bar__row');
    expect(users.querySelectorAll('.ohs-stacked-bar__segment')).toHaveLength(2);
    expect(users).toHaveTextContent('70%');
    expect(careTeams.querySelectorAll('.ohs-stacked-bar__segment')).toHaveLength(0);
    expect(careTeams).toHaveTextContent('0%');
  });

  it('carries every row and segment in the table alternative, with a legend for the series', async () => {
    const { container } = render(
      <StackedBar rows={rows} ariaLabel="Active share" labelHeader="Entity" />,
    );

    const table = screen.getByRole('table', { name: 'Active share' });
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent),
    ).toEqual(['EntityActiveInactive', 'Users73', 'Care teams00']);
    expect(container.querySelectorAll('.ohs-donut-legend__row')).toHaveLength(2);
    expect(
      (await axe(container, { rules: { 'color-contrast': { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
