import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';

interface PagedState {
  rows: unknown[];
  total: number | undefined;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  paginationMode: 'numbered' | 'links';
  isLoading: boolean;
  error: unknown;
}

const { paged, usePagedSearchMock } = vi.hoisted(() => {
  const paged = { current: null as PagedState | null };
  return { paged, usePagedSearchMock: vi.fn(() => paged.current) };
});

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: object) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
      dir: 'ltr',
      locale: 'en',
    }),
    usePagedSearch: usePagedSearchMock,
  };
});

const { FhirError } = await import('ohs-player-web-core');
const { ResourceListPanel } = await import('./ResourceListPanel');
const { resourceTypeDef } = await import('./registry');

const org = resourceTypeDef('Organization')!;

function lastSearchOptions(): { page: number; pageSize: number; params: Record<string, string> } {
  const call = usePagedSearchMock.mock.calls.at(-1) as unknown as [
    string,
    { page: number; pageSize: number; params: Record<string, string> },
  ];
  return call[1];
}

function base(partial: Partial<PagedState>): PagedState {
  return {
    rows: [],
    total: undefined,
    page: 0,
    pageSize: 10,
    hasNext: false,
    hasPrev: false,
    paginationMode: 'links',
    isLoading: false,
    error: null,
    ...partial,
  };
}

const orgRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    resourceType: 'Organization',
    id: `o${i}`,
    name: `Org ${i}`,
  }));

function renderPanel(
  overrides: { onOpenResource?: () => void; onOpenExample?: () => void } = {},
  def = org,
) {
  return render(
    <MemoryRouter>
      <ResourceListPanel
        def={def}
        onOpenResource={overrides.onOpenResource ?? vi.fn()}
        onOpenExample={overrides.onOpenExample ?? vi.fn()}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  paged.current = base({});
  usePagedSearchMock.mockClear();
});
afterEach(cleanup);

describe('ResourceListPanel', () => {
  it('renders real rows: ID + Name, and opens on Name click', () => {
    paged.current = base({
      rows: [{ resourceType: 'Organization', id: 'o1', name: 'Ministry of Health' }],
      total: 1,
      paginationMode: 'numbered',
    });
    const onOpen = vi.fn();
    renderPanel({ onOpenResource: onOpen });

    expect(screen.getByText('Ministry of Health')).toBeInTheDocument();
    expect(screen.getByText('o1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ministry of Health'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }));
  });

  it('renders "not available from this backend" on a gateway 401', () => {
    paged.current = base({ error: new FhirError('no patient_list claim', 401, undefined) });
    renderPanel();
    expect(screen.getByText('fhirViewerUnsupportedTitle')).toBeInTheDocument();
  });

  it('renders a genuine ErrorState on a 5xx', () => {
    paged.current = base({ error: new FhirError('Server boom', 500, undefined) });
    renderPanel();
    expect(screen.getByText('Server boom')).toBeInTheDocument();
  });

  it('shows the numbered pagination summary when a total is present', () => {
    paged.current = base({
      rows: orgRows(10),
      total: 25,
      hasNext: true,
      paginationMode: 'numbered',
    });
    renderPanel();
    expect(screen.getByText(/fhirViewerShowingOf/)).toBeInTheDocument();
  });

  it('has no critical a11y violations with rows rendered', async () => {
    paged.current = base({
      rows: [{ resourceType: 'Organization', id: 'o1', name: 'Ministry of Health' }],
      total: 1,
      paginationMode: 'numbered',
    });
    const { container } = renderPanel();
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});

describe('filter chips', () => {
  it('narrows server-side when a boolean-active Status chip value is applied, resetting to page 1', () => {
    paged.current = base({
      rows: orgRows(10),
      total: 25,
      hasNext: true,
      paginationMode: 'numbered',
    });
    renderPanel();

    fireEvent.click(screen.getByRole('combobox', { name: 'fhirViewerFilterStatus' }));
    fireEvent.click(screen.getByRole('option', { name: 'fhirViewerActive_active' }));

    const opts = lastSearchOptions();
    expect(opts.params.active).toBe('true');
    expect(opts.page).toBe(0);
    expect(
      screen.getByRole('combobox', { name: 'fhirViewerFilterStatus: fhirViewerActive_active' }),
    ).toBeInTheDocument();
  });

  it('sends _lastUpdated when the Last updated chip is applied', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('combobox', { name: 'fhirViewerFilterUpdated' }));
    fireEvent.click(screen.getByRole('option', { name: 'fhirViewerSince7d' }));

    expect(lastSearchOptions().params._lastUpdated).toMatch(/^ge\d{4}-/);
  });

  it('uses the free-text popover for coded-status types and filters on the entered code', () => {
    const encounter = resourceTypeDef('Encounter')!;
    renderPanel({}, encounter);

    fireEvent.click(screen.getByRole('button', { name: 'fhirViewerFilterStatus' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'fhirViewerFilterStatus' }), {
      target: { value: 'finished' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'filterApply' }));

    expect(lastSearchOptions().params.status).toBe('finished');
    expect(
      screen.getByRole('button', { name: 'fhirViewerFilterStatus: finished' }),
    ).toBeInTheDocument();
  });

  it('shows Clear all only while a chip is applied and resets every chip', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: 'filterClearAll' })).toBeNull();

    fireEvent.click(screen.getByRole('combobox', { name: 'fhirViewerFilterUpdated' }));
    fireEvent.click(screen.getByRole('option', { name: 'fhirViewerSince24h' }));
    fireEvent.click(screen.getByRole('button', { name: 'filterClearAll' }));

    expect(screen.queryByRole('button', { name: 'filterClearAll' })).toBeNull();
    expect(lastSearchOptions().params._lastUpdated).toBeUndefined();
  });
});

describe('example placeholder', () => {
  it('shows a badged example row instead of a blank table when there is no data', () => {
    paged.current = base({ rows: [], total: 0 });
    renderPanel();

    expect(screen.getByText('fhirViewerExampleBadge')).toBeInTheDocument();
    expect(screen.getByText('Demo Health Organization')).toBeInTheDocument();
    expect(screen.getByText(/fhirViewerExampleNote/)).toBeInTheDocument();
  });

  it('opens the example through onOpenExample, never onOpenResource', () => {
    paged.current = base({ rows: [], total: 0 });
    const onOpenResource = vi.fn();
    const onOpenExample = vi.fn();
    renderPanel({ onOpenResource, onOpenExample });

    fireEvent.click(screen.getByText('Demo Health Organization'));
    expect(onOpenExample).toHaveBeenCalledWith(expect.objectContaining({ id: 'example' }));
    expect(onOpenResource).not.toHaveBeenCalled();
  });

  it('disappears automatically once real rows exist', () => {
    paged.current = base({ rows: orgRows(1), total: 1, paginationMode: 'numbered' });
    renderPanel();

    expect(screen.queryByText('fhirViewerExampleBadge')).toBeNull();
    expect(screen.queryByText(/fhirViewerExampleNote/)).toBeNull();
    expect(screen.getByText('Org 0')).toBeInTheDocument();
  });

  it('is not shown when the type is unavailable from this backend', () => {
    paged.current = base({ error: new FhirError('denied', 403, undefined) });
    renderPanel();
    expect(screen.queryByText('fhirViewerExampleBadge')).toBeNull();
  });

  it('is not shown while still loading', () => {
    paged.current = base({ rows: [], isLoading: true });
    renderPanel();
    expect(screen.queryByText('fhirViewerExampleBadge')).toBeNull();
  });
});
