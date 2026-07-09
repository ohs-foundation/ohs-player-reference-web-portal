import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LocationNode } from './hierarchy';

const LOCATION_RESOURCE = {
  resourceType: 'Location',
  id: 'msa',
  status: 'active',
  name: 'Mombasa County',
  mode: 'instance',
  identifier: [{ system: 'http://ohs.dev/identifiers/source-id', value: 'MSA' }],
  address: { line: ['House 24, Beach Road'] },
  position: { latitude: 44.7585, longitude: -110.84699 },
  managingOrganization: { reference: 'Organization/org-1', display: 'County Government of Mombasa' },
};

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key), dir: 'ltr', locale: 'en' }),
    useStatusBar: () => ({ notify: vi.fn() }),
    PermissionGuard: ({ children }: { children?: unknown }) => children,
    useUpdateResource: () => ({ mutateAsync: vi.fn() }),
    useResource: (type: string) => {
      if (type === 'Location') return { data: LOCATION_RESOURCE };
      if (type === 'Organization') return { data: { resourceType: 'Organization', id: 'org-1', name: 'County Government of Mombasa' } };
      return { data: undefined };
    },
  };
});

vi.mock('../audit/useWriteAudit', () => ({ useWriteAudit: () => vi.fn() }));

const { LocationDetailPanel } = await import('./LocationDetailPanel');

function node(partial: Partial<LocationNode> & { id: string }): LocationNode {
  return {
    name: partial.id,
    status: 'active',
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
  children: [
    node({
      id: 'msa',
      name: 'Mombasa County',
      children: [node({ id: 'mvita', name: 'Mvita', partOf: 'msa' }), node({ id: 'nyali', name: 'Nyali', partOf: 'msa' })],
    }),
  ],
});

function renderPanel(overrides: Partial<React.ComponentProps<typeof LocationDetailPanel>> = {}) {
  return render(
    <LocationDetailPanel root={root} nodeId="msa" onClose={vi.fn()} onSelect={vi.fn()} onEdit={vi.fn()} {...overrides} />,
  );
}

describe('LocationDetailPanel', () => {
  it('renders FHIR-read fields: address, mode, coordinates, source id, managing organisation', () => {
    renderPanel();
    expect(screen.getByText('House 24, Beach Road')).toBeInTheDocument();
    expect(screen.getByText('instance')).toBeInTheDocument();
    expect(screen.getByText('44.7585')).toBeInTheDocument();
    expect(screen.getByText('-110.84699')).toBeInTheDocument();
    expect(screen.getAllByText('MSA').length).toBeGreaterThan(0); // header chip + Source ID field
    expect(screen.getByText('County Government of Mombasa')).toBeInTheDocument();
  });

  it('renders child locations as chips and selects on click', () => {
    const onSelect = vi.fn();
    renderPanel({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: 'Nyali' }));
    expect(onSelect).toHaveBeenCalledWith('nyali');
  });

  it('links to the parent location', () => {
    const onSelect = vi.fn();
    renderPanel({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: 'Kenya' }));
    expect(onSelect).toHaveBeenCalledWith('ke');
  });

  it('switches to the FHIR Viewer tab and shows the resource JSON', () => {
    renderPanel();
    // Radix Tabs (automatic activation) switch on focus, which jsdom's synthetic click doesn't fire.
    fireEvent.focus(screen.getByRole('tab', { name: /locationsTabFhir/ }));
    expect(screen.getByText(/"resourceType": "Location"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /locationsCopyCode/ })).toBeInTheDocument();
  });

  it('offers Edit Details (and no deactivate) in the footer', () => {
    const onEdit = vi.fn();
    renderPanel({ onEdit });
    fireEvent.click(screen.getByRole('button', { name: /editDetails/ }));
    expect(onEdit).toHaveBeenCalledWith('msa');
    // Deactivate was removed (gateway hierarchy cache can't reflect the write).
    expect(screen.queryByText(/[Dd]eactivate/)).not.toBeInTheDocument();
  });
});
