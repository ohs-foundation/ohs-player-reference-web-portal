import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminScopeContext, UNSCOPED, type AdminScope } from '../scope/useAdminScope';
import type { LocationNode } from './hierarchy';

const refreshSpy = vi.fn().mockResolvedValue(undefined);
const refreshHierarchySpy = vi.fn().mockResolvedValue(undefined);
const rootsEnabled = vi.fn();
const rootsRefetch = vi.fn().mockResolvedValue(undefined);
const hierarchyRoot = vi.fn();

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
  useLocationRoots: (enabled?: boolean) => {
    rootsEnabled(enabled);
    return { data: [{ value: 'ke', label: 'Kenya' }], isLoading: false, refetch: rootsRefetch };
  },
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
  useLocationHierarchy: (rootId: string | undefined) => {
    hierarchyRoot(rootId);
    return {
      data: { root: rootNode, meta: { nodeCount: 1, depth: 0, truncated: false, builtAt: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

vi.mock('./LocationCreateDrawer', () => ({
  LocationCreateDrawer: ({
    onSuccess,
  }: {
    onSuccess: (created: { id: string; name: string }) => void;
  }) => (
    <button type="button" onClick={() => onSuccess({ id: 'new', name: 'New' })}>
      finish-create
    </button>
  ),
}));

vi.mock('../bulk-import/BulkImportDrawer', () => ({
  BulkImportDrawer: ({ open, onComplete }: { open: boolean; onComplete: () => void }) =>
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

describe('LocationsHierarchyPage scope', () => {
  const nairobi = { id: 'nrb', name: 'Nairobi' };

  function renderWith(scope: AdminScope) {
    rootsEnabled.mockClear();
    rootsRefetch.mockClear();
    hierarchyRoot.mockClear();
    return render(
      <MemoryRouter initialEntries={['/locations']}>
        <AdminScopeContext.Provider value={scope}>
          <LocationsHierarchyPage />
        </AdminScopeContext.Provider>
      </MemoryRouter>,
    );
  }

  it('keeps the root picker and the first root for an unscoped user', () => {
    renderWith(UNSCOPED);

    expect(screen.getByLabelText('locationsRoot')).toBeInTheDocument();
    expect(rootsEnabled).toHaveBeenLastCalledWith(true);
    expect(hierarchyRoot).toHaveBeenLastCalledWith('ke');
    expect(screen.queryByText(/scopeConvenienceNote/)).toBeNull();
  });

  it('roots the tree at the district, even one that is not a hierarchy root', () => {
    renderWith({ ...UNSCOPED, status: 'scoped', districts: [nairobi], current: nairobi });

    expect(screen.queryByLabelText('locationsRoot')).toBeNull();
    expect(rootsEnabled).toHaveBeenLastCalledWith(false);
    expect(hierarchyRoot).toHaveBeenLastCalledWith('nrb');
    expect(screen.getByText(/scopeConvenienceNote/)).toBeInTheDocument();
  });

  it('reads no tree until the scope has resolved', () => {
    renderWith({ ...UNSCOPED, status: 'loading' });

    expect(rootsEnabled).toHaveBeenLastCalledWith(false);
    expect(hierarchyRoot.mock.calls.every(([id]) => id === undefined)).toBe(true);
  });

  it('refreshes the roots after a create while it shows them', () => {
    renderWith(UNSCOPED);
    fireEvent.click(screen.getByRole('button', { name: 'dialogCreateLocation' }));
    fireEvent.click(screen.getByRole('button', { name: 'finish-create' }));

    expect(rootsRefetch).toHaveBeenCalledTimes(1);
  });

  it('skips the roots walk after a scoped create, since the district is the only root', () => {
    renderWith({ ...UNSCOPED, status: 'scoped', districts: [nairobi], current: nairobi });
    fireEvent.click(screen.getByRole('button', { name: 'dialogCreateLocation' }));
    fireEvent.click(screen.getByRole('button', { name: 'finish-create' }));

    expect(rootsRefetch).not.toHaveBeenCalled();
  });
});
