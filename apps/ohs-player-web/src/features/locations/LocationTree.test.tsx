import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import type { LocationNode } from './hierarchy';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
      dir: 'ltr',
      locale: 'en',
    }),
  };
});

const { LocationTree } = await import('./LocationTree');

const root: LocationNode = {
  id: 'ke',
  name: 'Kenya',
  partOf: null,
  hasMoreChildren: false,
  children: [
    { id: 'nrb', name: 'Nairobi', partOf: 'ke', hasMoreChildren: false, children: [] },
    { id: 'unnamed', name: null, partOf: 'ke', hasMoreChildren: false, children: [] },
  ],
};

describe('LocationTree', () => {
  it('renders an accessible tree with treeitems and aria-expanded on the expandable root', () => {
    render(
      <LocationTree
        root={root}
        expanded={new Set(['ke'])}
        selectedId={null}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByRole('tree')).toBeInTheDocument();
    const items = screen.getAllByRole('treeitem');
    expect(items.length).toBe(3); // root + 2 children (root expanded)
    expect(screen.getByText('Kenya')).toBeInTheDocument();
    expect(items[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders an unnamed placeholder for null names', () => {
    render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} />,
    );
    expect(screen.getByText(/locationsUnnamed/)).toBeInTheDocument();
  });

  it('calls onSelect when a row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={onSelect} onLoadMore={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Nairobi'));
    expect(onSelect).toHaveBeenCalledWith('nrb');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId="nrb" onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} />,
    );
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
