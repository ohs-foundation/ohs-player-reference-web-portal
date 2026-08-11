import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const searchBundles: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  CareTeam: {
    entry: [
      {
        resource: { resourceType: 'CareTeam', id: 'ct1', name: 'Maternity Team', status: 'active' },
      },
      {
        resource: {
          resourceType: 'CareTeam',
          id: 'ct2',
          name: 'Archived Team',
          status: 'inactive',
        },
      },
    ],
  },
  Practitioner: { entry: [] },
  Organization: { entry: [] },
};

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
    useRefreshResources: () => vi.fn().mockResolvedValue(undefined),
    useOptimisticInsert: () => () => () => undefined,
    PermissionGuard: ({ children }: { children: React.ReactNode }) => children,
    useSearch: (resourceType: string) => ({
      data: searchBundles[resourceType] ?? { entry: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const { CareTeamsPage } = await import('./CareTeamsPage');

function renderPage(initialEntry = '/care-teams') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CareTeamsPage />
    </MemoryRouter>,
  );
}

describe('CareTeamsPage status filter', () => {
  it('narrows the table when the Status chip is applied and restores via Clear all', () => {
    renderPage();
    expect(screen.getByText('Maternity Team')).toBeInTheDocument();
    expect(screen.getByText('Archived Team')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox', { name: 'filterStatus' }));
    fireEvent.click(screen.getByRole('option', { name: 'filterStatusInactive' }));

    expect(screen.queryByText('Maternity Team')).toBeNull();
    expect(screen.getByText('Archived Team')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'filterClearAll' }));
    expect(screen.getByText('Maternity Team')).toBeInTheDocument();
  });

  it('hydrates the chip from the URL so filtered views deep-link', () => {
    renderPage('/care-teams?status=active');
    expect(
      screen.getByRole('combobox', { name: 'filterStatus: filterStatusActive' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Maternity Team')).toBeInTheDocument();
    expect(screen.queryByText('Archived Team')).toBeNull();
  });
});
