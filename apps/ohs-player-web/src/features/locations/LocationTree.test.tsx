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

// Row menu needs Router + query/config providers; it has its own test — stub it here.
vi.mock('./LocationRowMenu', () => ({
  LocationRowMenu: ({ nodeId }: { nodeId: string }) => <button type="button" aria-label={`actions-${nodeId}`} />,
}));

const { LocationTree } = await import('./LocationTree');

function node(partial: Partial<LocationNode> & { id: string }): LocationNode {
  return {
    name: null,
    status: 'active',
    partOf: 'ke',
    partOfLabel: 'Kenya',
    physicalType: null,
    type: [],
    hasMoreChildren: false,
    children: [],
    ...partial,
  };
}

const root: LocationNode = node({
  id: 'ke',
  name: 'Kenya',
  partOf: null,
  partOfLabel: null,
  children: [node({ id: 'nrb', name: 'Nairobi' }), node({ id: 'unnamed', name: null })],
});

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
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByRole('tree')).toBeInTheDocument();
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(3); // root + 2 children (root expanded)
    expect(screen.getByText('Kenya')).toBeInTheDocument();
    expect(items[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders an unnamed placeholder for null names', () => {
    render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(screen.getByText(/locationsUnnamed/)).toBeInTheDocument();
  });

  it('calls onSelect when a row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={onSelect} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Nairobi'));
    expect(onSelect).toHaveBeenCalledWith('nrb');
  });

  it('shows a status badge and a child-count meta line on the root row', () => {
    render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    // Root has partOf === null → a "Root" meta prefix, and 2 children → child-count text.
    expect(screen.getByText(/locationLevelRoot/)).toBeInTheDocument();
    expect(screen.getByText(/locationsChildLocations/)).toBeInTheDocument();
    // Every node carries status 'active' → a status badge renders (default helper key).
    expect(screen.getAllByText(/locationStatusActive/).length).toBeGreaterThan(0);
  });

  it('uses an expand toggle (not a checkbox) on expandable rows', () => {
    render(
      <LocationTree root={root} expanded={new Set()} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand/ })).toBeInTheDocument();
  });

  it('renders real tree connector lines for expanded children (not margin-only indent)', () => {
    const { container } = render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    // Child rows draw 1px connector spans using the border token; the root (depth 0) draws none.
    const lines = container.querySelectorAll('span.bg-border-secondary');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('uses a down chevron when expanded and a right chevron when collapsed', () => {
    const { rerender } = render(
      <LocationTree root={root} expanded={new Set()} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /expand/ })).toBeInTheDocument();
    rerender(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId={null} onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /collapse/ })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <LocationTree root={root} expanded={new Set(['ke'])} selectedId="nrb" onToggle={vi.fn()} onSelect={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} />,
    );
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
