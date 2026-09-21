import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSearch = vi.fn();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key} ${Object.values(params).join(' ')}` : key,
      formatDate: (date: Date) => date.toISOString().slice(0, 10),
      formatNumber: (value: number) => String(value),
      dir: 'ltr',
      locale: 'en',
    }),
    useSearch: (...args: unknown[]): unknown => mockUseSearch(...args),
  };
});

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { platformConfig } = await import('../../config/platform');
const { default: SchedulesPage } = await import('./SchedulesPage');

const scheduleBundle = {
  resourceType: 'Bundle',
  entry: [
    {
      resource: {
        resourceType: 'Schedule',
        id: 'schedule-1',
        active: true,
        actor: [{ reference: 'Practitioner/p1', display: 'Jane Smith' }],
        planningHorizon: { start: '2026-09-01', end: '2026-09-30' },
      },
    },
    {
      resource: {
        resourceType: 'Schedule',
        id: 'schedule-2',
        active: false,
        actor: [{ reference: 'Location/l1' }],
      },
    },
  ],
};

function searchReturns(result: { data?: unknown; isLoading?: boolean; error?: unknown }): void {
  mockUseSearch.mockReturnValue({ data: undefined, isLoading: false, error: null, ...result });
}

function renderPage(path = '/schedules') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CorePlatformProvider config={platformConfig}>
        <SchedulesPage />
      </CorePlatformProvider>
    </MemoryRouter>,
  );
}

describe('SchedulesPage', () => {
  beforeEach(() => {
    mockUseSearch.mockReset();
  });

  it('lists each schedule with its actors, planning horizon and status', () => {
    searchReturns({ data: scheduleBundle });
    renderPage();

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Location/l1')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01 – 2026-09-30')).toBeInTheDocument();
    expect(screen.getByText('statusActive')).toBeInTheDocument();
    expect(screen.getByText('statusInactive')).toBeInTheDocument();
  });

  it('shows the loading row while the search runs', () => {
    searchReturns({ isLoading: true });
    renderPage();

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('schedulesEmptyTitle')).not.toBeInTheDocument();
  });

  it('shows the empty state when the server has no schedules', () => {
    searchReturns({ data: { resourceType: 'Bundle', entry: [] } });
    renderPage();

    expect(screen.getByText('schedulesEmptyTitle')).toBeInTheDocument();
  });

  it('shows the error the FHIR server returned', () => {
    searchReturns({ error: new Error('Server unavailable') });
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
  });

  it('filters by the actor in the address and links back to every schedule', () => {
    searchReturns({ data: scheduleBundle });
    renderPage('/schedules?actor=Practitioner%2Fp1');

    expect(mockUseSearch).toHaveBeenCalledWith('Schedule', {
      actor: 'Practitioner/p1',
      _count: '50',
    });
    expect(screen.getByText('schedulesForActor Practitioner/p1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'schedulesShowAll' })).toHaveAttribute(
      'href',
      '/schedules',
    );
  });

  it('has no serious or critical accessibility violations', async () => {
    searchReturns({ data: scheduleBundle });
    const { container } = renderPage();

    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
  });
});
