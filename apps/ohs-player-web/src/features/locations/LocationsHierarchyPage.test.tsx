import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LocationNode } from './hierarchy';

const refreshSpy = vi.fn().mockResolvedValue(undefined);
const hierarchyRefetch = vi.fn().mockResolvedValue(undefined);

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
      dir: 'ltr',
      locale: 'en',
    }),
    useStatusBar: () => ({ notify: vi.fn() }),
    PermissionGuard: ({ children }: { children?: unknown }) => children,
    useRefreshResources: () => refreshSpy,
    useSearch: () => ({
      data: { resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Location', id: 'ke', name: 'Kenya' } }] },
      isLoading: false,
    }),
  };
});

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
  ],
  hasMoreChildren: false,
};

vi.mock('./useLocationHierarchy', () => ({
  useLocationHierarchy: () => ({
    data: { root: rootNode, meta: { nodeCount: 1, depth: 0, truncated: false, builtAt: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: hierarchyRefetch,
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

describe('LocationsHierarchyPage import completion', () => {
  // Regression: the import bypasses TanStack mutations, so the dropdown search needs explicit invalidation.
  it('invalidates the Location search cache and refetches the hierarchy when an import completes', () => {
    render(<LocationsHierarchyPage />);
    fireEvent.click(screen.getByRole('button', { name: /locationsImport/ }));
    fireEvent.click(screen.getByRole('button', { name: 'finish-import' }));
    expect(refreshSpy).toHaveBeenCalledWith('Location');
    expect(hierarchyRefetch).toHaveBeenCalled();
  });
});
