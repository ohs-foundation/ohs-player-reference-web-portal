import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import type { LocationNode } from './hierarchy';
import { ADMIN_LEVEL_SYSTEM } from './locationLevel';

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

const { LocationColumnTable } = await import('./LocationColumnTable');

function node(partial: Partial<LocationNode> & { id: string }): LocationNode {
  return {
    name: null,
    status: 'active',
    description: null,
    partOf: 'ke',
    partOfLabel: 'Kenya',
    physicalType: null,
    type: [],
    children: [],
    hasMoreChildren: false,
    ...partial,
  };
}

const root: LocationNode = node({
  id: 'ke',
  name: 'Kenya',
  partOf: null,
  partOfLabel: null,
  type: [{ coding: [{ system: ADMIN_LEVEL_SYSTEM, code: 'country' }] }],
  children: [node({ id: 'nrb', name: 'Nairobi', type: [{ coding: [{ system: ADMIN_LEVEL_SYSTEM, code: 'county' }] }] })],
});

describe('LocationColumnTable', () => {
  it('flattens the tree into table rows with name, level badge, parent and status', () => {
    render(<LocationColumnTable root={root} onSelect={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    // Two data rows: the root (Kenya) and its child (Nairobi).
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 data rows
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
    // "Kenya" appears twice: the root's own name cell and Nairobi's parent link.
    expect(screen.getAllByText('Kenya').length).toBeGreaterThanOrEqual(2);
    // Root gets the Root level label; the child gets its county level.
    expect(screen.getByText('locationLevelRoot')).toBeInTheDocument();
    expect(screen.getByText('locationLevelCounty')).toBeInTheDocument();
  });

  it('selects the clicked parent link', () => {
    const onSelect = vi.fn();
    render(<LocationColumnTable root={root} onSelect={onSelect} onChanged={vi.fn()} />);
    const nairobiRow = screen.getByText('Nairobi').closest('tr') as HTMLElement;
    fireEvent.click(within(nairobiRow).getByRole('button', { name: /Kenya/ }));
    expect(onSelect).toHaveBeenCalledWith('ke');
  });

  it('opens the details drawer target on row click', () => {
    const onSelect = vi.fn();
    render(<LocationColumnTable root={root} onSelect={onSelect} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByText('Nairobi'));
    expect(onSelect).toHaveBeenCalledWith('nrb');
  });

  it('has no axe violations', async () => {
    const { container } = render(<LocationColumnTable root={root} onSelect={vi.fn()} onChanged={vi.fn()} />);
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
