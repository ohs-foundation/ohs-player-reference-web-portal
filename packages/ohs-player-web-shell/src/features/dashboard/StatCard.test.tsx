import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconAccountCircleFill } from '../../components/ui/icons';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, string | number>) =>
        vars ? `${key}:${JSON.stringify(vars)}` : key,
      dir: 'ltr',
      locale: 'en',
    }),
  };
});

const { StatCard } = await import('./StatCard');

const base = {
  label: 'Total Users',
  badgeColor: '#D398E6',
  glyph: IconAccountCircleFill,
};

describe('StatCard', () => {
  it('renders the label and the live count', () => {
    render(<StatCard {...base} value={956} loading={false} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('956')).toBeInTheDocument();
  });

  it('omits the trend row while no prior-period figure exists', () => {
    const { container } = render(<StatCard {...base} value={956} loading={false} />);
    expect(container.querySelector('.ohs-kpi__trend')).toBeNull();
  });

  it('marks a positive delta as an increase', () => {
    const { container } = render(
      <StatCard {...base} value={956} loading={false} trendPercent={12} />,
    );
    expect(container.querySelector('.ohs-kpi__trend')).toHaveAttribute('data-direction', 'up');
    expect(screen.getByText(/kpiTrendIncrease/)).toHaveTextContent('12');
  });

  it('marks a negative delta as a decrease and shows its magnitude unsigned', () => {
    const { container } = render(
      <StatCard {...base} value={956} loading={false} trendPercent={-8} />,
    );
    expect(container.querySelector('.ohs-kpi__trend')).toHaveAttribute('data-direction', 'down');
    expect(screen.getByText(/kpiTrendDecrease/)).toHaveTextContent('8');
    expect(screen.queryByText(/-8/)).toBeNull();
  });

  it('shows a spinner instead of a value while loading', () => {
    render(<StatCard {...base} value={undefined} loading />);
    expect(screen.queryByText('956')).toBeNull();
  });

  it('falls back to a dash when the count is unavailable', () => {
    render(<StatCard {...base} value={undefined} loading={false} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
