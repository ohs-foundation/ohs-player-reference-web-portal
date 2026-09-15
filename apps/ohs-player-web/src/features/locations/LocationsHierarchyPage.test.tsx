import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { LocationNode } from './hierarchy';

const refreshSpy = vi.fn().mockResolvedValue(undefined);
const refreshHierarchySpy = vi.fn().mockResolvedValue(undefined);

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) =>
        vars ? `${key} ${JSON.stringify(vars)}` : key,
      dir: 'ltr',
      locale: 'en',
    }),
    useStatusBar: () => ({ notify: vi.fn() }),
    PermissionGuard: ({ children }: { children?: unknown }) => children,
    useRefreshResources: () => refreshSpy,
  };
});

vi.mock('./useLocationRoots', () => ({
  useLocationRoots: () => ({
    data: [{ value: 'ke', label: 'Kenya' }],
    isLoading: false,
  }),
}));

const rootNode: LocationNode = {
  id: 'ke',
  name: 'Kenya',
  status: 'active',
  partOf: null,
  partOfLabel: null,
  physicalType: null,
  type: [],
  children: [
    {
      id: 'nrb',
      name: 'Nairobi',
      status: 'active',
      partOf: 'ke',
      partOfLabel: 'Kenya',
      physicalType: null,
      type: [],
      children: [],
      hasMoreChildren: false,
    },
    {
      id: 'msa',
      name: 'Mombasa',
      status: 'inactive',
      partOf: 'ke',
      partOfLabel: 'Kenya',
      physicalType: null,
      type: [],
      children: [],
      hasMoreChildren: false,
    },
  ],
  hasMoreChildren: false,
};

vi.mock('./useLocationHierarchy', () => ({
  useApplyHierarchyEdit: () => vi.fn(),
  useRefreshHierarchy: () => refreshHierarchySpy,
  useLocationHierarchy: () => ({
    data: { root: rootNode, meta: { nodeCount: 1, depth: 0, truncated: false, builtAt: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('./LocationImportDrawer', () => ({
  LocationImportDrawer: ({ open, onComplete }: { open: boolean; onComplete: () => void }) =>
    open ? (
      <button type="button" onClick={onComplete}>
        finish-import
      </button>
    ) : null,
}));

const { LocationsHierarchyPage } = await import('./LocationsHierarchyPage');

function renderPage(initialEntry = '/locations') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationsHierarchyPage />
    </MemoryRouter>,
  );
}

describe('LocationsHierarchyPage status filter', () => {
  it('renders the status chip on load with all four status options, Suspended included', () => {
    renderPage();
    fireEvent.click(screen.getByRole('combobox', { name: 'locationsFilterStatus' }));

    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([
      'locationsFilterAll',
      'locationStatusActive',
      'locationStatusSuspended',
      'locationStatusInactive',
    ]);
  });

  it('narrows the tree when a status is applied and restores it via Clear all', () => {
    renderPage();
    fireEvent.click(screen.getByRole('combobox', { name: 'locationsFilterStatus' }));
    fireEvent.click(screen.getByRole('option', { name: 'locationStatusActive' }));

    expect(screen.getByText('Nairobi')).toBeInTheDocument();
    expect(screen.queryByText('Mombasa')).toBeNull();
    expect(
      screen.getByRole('combobox', { name: 'locationsFilterStatus: locationStatusActive' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'filterClearAll' }));
    expect(screen.getByRole('combobox', { name: 'locationsFilterStatus' })).toBeInTheDocument();
  });

  it('hydrates the chip from the URL so filtered views deep-link', () => {
    renderPage('/locations?status=inactive');
    expect(
      screen.getByRole('combobox', { name: 'locationsFilterStatus: locationStatusInactive' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mombasa')).toBeInTheDocument();
    expect(screen.queryByText('Nairobi')).toBeNull();
  });
});

describe('LocationsHierarchyPage import completion', () => {
  // Regression: the import bypasses TanStack mutations, so the dropdown search needs explicit invalidation
  // and the tree needs an authoritative (cache-evicting) refresh so imported roots survive a reload.
  it('invalidates the Location search cache and force-refreshes the hierarchy when an import completes', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /locationsImport/ }));
    fireEvent.click(screen.getByRole('button', { name: 'finish-import' }));
    expect(refreshSpy).toHaveBeenCalledWith('Location');
    expect(refreshHierarchySpy).toHaveBeenCalled();
  });
});
