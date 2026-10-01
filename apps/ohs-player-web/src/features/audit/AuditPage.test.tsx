import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { axe } from 'vitest-axe';
import type { AuditEvent } from '@medplum/fhirtypes';
import {
  gatewaySearch,
  legacyWithoutAction,
  portalCreateWithoutEntity,
  portalUpdate,
} from './__fixtures__/auditEvents';
import { localDayStart, nextLocalDayStart } from './auditFilters';

interface PagedState {
  rows: AuditEvent[];
  total: number | undefined;
  hasNext: boolean;
  paginationMode: 'numbered' | 'links';
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
}

type SearchOptions = { page: number; pageSize: number; params: Record<string, unknown> };

const { paged, usePagedSearchMock, notify } = vi.hoisted(() => {
  const paged = { current: null as PagedState | null };
  const usePagedSearchMock = vi.fn((_type: string, options: SearchOptions) => ({
    ...paged.current,
    page: options.page,
    pageSize: options.pageSize,
    hasPrev: options.page > 0,
  }));
  return { paged, usePagedSearchMock, notify: vi.fn() };
});

vi.mock(
  'ohs-player-web-core',
  async (): Promise<object> => ({
    ...(await vi.importActual<object>('ohs-player-web-core')),
    useTranslation: () => ({
      t: (key: string, vars?: object) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
      formatDateTime: (d: Date) => `at ${d.toISOString()}`,
      dir: 'ltr',
      locale: 'en',
    }),
    usePagedSearch: usePagedSearchMock,
    useStatusBar: () => ({ notify }),
  }),
);

const { FhirError } = await import('ohs-player-web-core');
const { AuditPage } = await import('./AuditPage');

let currentSearch = '';
function LocationProbe(): null {
  currentSearch = useLocation().search;
  return null;
}

function renderPage(url = '/audit') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuditPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function state(partial: Partial<PagedState>): PagedState {
  return {
    rows: [portalUpdate, gatewaySearch],
    total: 2,
    hasNext: false,
    paginationMode: 'numbered',
    isLoading: false,
    isFetching: false,
    error: null,
    ...partial,
  };
}

function lastSearch(): SearchOptions {
  return (usePagedSearchMock.mock.calls.at(-1) as [string, SearchOptions])[1];
}

function openChip(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => {
  paged.current = state({});
  usePagedSearchMock.mockClear();
  notify.mockReset();
});
afterEach(cleanup);

describe('AuditPage', () => {
  it('lists events newest first with when, who, action, resource type and resource', () => {
    renderPage();

    expect(usePagedSearchMock.mock.calls[0][0]).toBe('AuditEvent');
    expect(lastSearch().params).toEqual({ _sort: '-date' });
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(rows[0].querySelector('time')).toHaveAttribute('dateTime', '2026-09-22T08:30:00.000Z');
    expect(first.getByText('admin-user')).toBeInTheDocument();
    expect(first.getByText('activityUpdated')).toBeInTheDocument();
    expect(first.getByText('Location')).toBeInTheDocument();
    expect(first.getByRole('button', { name: /auditOpenDetails/ })).toHaveTextContent('l1');
  });

  it('names each row and its control with the action and the resource', () => {
    renderPage();

    expect(screen.getByRole('row', { name: /activityUpdated.*Location/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'auditOpenDetails {"action":"activityUpdated","resource":"Location l1"}',
      }),
    ).toBeInTheDocument();
  });

  it('reads gateway events through the requesting agent and the data entity', () => {
    renderPage();
    const row = screen.getByRole('row', { name: /activityViewed/ });
    expect(within(row).getByText('manager-user')).toBeInTheDocument();
    expect(within(row).getByText('Organization')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /auditOpenDetails/ })).toHaveTextContent('o2');
  });

  it('opens the full event, raw JSON included, from the row control and from a row click', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /"resource":"Location l1"/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('pre')).toHaveTextContent('"id": "ae-portal"');
    fireEvent.click(within(dialog).getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByText('manager-user'));
    expect(screen.getByRole('dialog').querySelector('pre')).toHaveTextContent('"id": "ae-gateway"');
  });

  it('still opens an event that names no resource', () => {
    paged.current = state({ rows: [portalCreateWithoutEntity, legacyWithoutAction] });
    renderPage();

    const control = screen.getByRole('button', {
      name: 'auditOpenDetailsNoResource {"action":"activityCreated"}',
    });
    expect(control).toHaveTextContent('auditNoResource');
    expect(screen.getByRole('row', { name: /activityChanged/ })).toBeInTheDocument();
    fireEvent.click(control);
    expect(screen.getByRole('dialog').querySelector('pre')).toHaveTextContent(
      '"id": "ae-no-entity"',
    );
  });

  it('shows a loading row and no footer while the first page loads', () => {
    paged.current = state({ rows: [], total: undefined, isLoading: true });
    renderPage();
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();
  });

  it('shows a progress bar while a later page or filter change loads', () => {
    paged.current = state({ isFetching: true });
    renderPage();
    expect(screen.getByRole('progressbar', { name: 'auditRefreshing' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no events at all', () => {
    paged.current = state({ rows: [], total: 0 });
    renderPage();
    expect(screen.getByText('auditEmptyTitle')).toBeInTheDocument();
    expect(screen.getByText('auditEmptyDescription')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'filterClearAll' })).toBeNull();
  });

  it('offers Clear all from the filtered empty state and clears only the audit filters', () => {
    paged.current = state({ rows: [], total: 0 });
    renderPage('/audit?keep=1&action=U&agent=adm');

    expect(screen.getByText('auditEmptyFilteredDescription')).toBeInTheDocument();
    const clearButtons = screen.getAllByRole('button', { name: 'filterClearAll' });
    fireEvent.click(clearButtons[clearButtons.length - 1]);
    expect(currentSearch).toBe('?keep=1');
  });

  it('shows the OperationOutcome text when the server fails', () => {
    const outcome = {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'exception', diagnostics: 'HAPI-0389: database down' }],
    };
    paged.current = state({
      rows: [],
      error: new FhirError('Internal Server Error', 500, outcome),
    });
    renderPage();
    expect(screen.getByText('auditErrorTitle')).toBeInTheDocument();
    expect(screen.getByText(/HAPI-0389: database down/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();
  });

  it('shows fixed copy, not the server body, when access is denied', () => {
    paged.current = state({
      rows: [],
      error: new FhirError('missing role GET_AUDITEVENT', 403, undefined),
    });
    renderPage();
    expect(screen.getByText('auditErrorForbidden')).toBeInTheDocument();
    expect(screen.queryByText(/GET_AUDITEVENT/)).toBeNull();
  });

  it('turns every filter in the URL into its FHIR search parameter', () => {
    renderPage('/audit?action=U&resourceType=Location&agent=adm&from=2026-09-01&to=2026-09-22');

    expect(lastSearch().params).toEqual({
      _sort: '-date',
      action: 'U',
      'entity-type': 'http://hl7.org/fhir/resource-types|Location',
      'agent-name': 'adm',
      date: [`ge${localDayStart('2026-09-01')}`, `lt${nextLocalDayStart('2026-09-22')}`],
    });
    expect(
      screen.getByRole('combobox', { name: 'auditFilterAction: activityUpdated' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auditFilterFrom: 2026-09-01' })).toBeInTheDocument();
  });

  it('ignores hand-edited values it cannot use', () => {
    renderPage('/audit?action=Z&resourceType=1abc&agent=%20%20&from=not-a-date&to=2026-13-40');

    expect(lastSearch().params).toEqual({ _sort: '-date' });
    expect(screen.getByRole('combobox', { name: 'auditFilterAction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auditFilterResourceType' })).toBeInTheDocument();
  });

  it('warns about an inverted date range and does not send it', () => {
    renderPage('/audit?from=2026-09-22&to=2026-09-01');
    expect(screen.getByRole('alert')).toHaveTextContent('auditFilterRangeError');
    expect(lastSearch().params).toEqual({ _sort: '-date' });
  });

  it('writes the chosen action to the URL with the keyboard', () => {
    renderPage();
    const chip = screen.getByRole('combobox', { name: 'auditFilterAction' });

    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    for (let i = 0; i < 3; i++) fireEvent.keyDown(chip, { key: 'ArrowDown' });
    fireEvent.keyDown(chip, { key: 'Enter' });

    expect(currentSearch).toBe('?action=U');
    expect(lastSearch().params).toMatchObject({ action: 'U' });
  });

  it('writes the resource type, agent and date range to the URL', () => {
    renderPage();

    openChip('auditFilterResourceType');
    fireEvent.change(screen.getByRole('textbox', { name: 'auditFilterResourceType' }), {
      target: { value: 'Practitioner' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'filterApply' }));

    openChip('auditFilterAgent');
    fireEvent.change(screen.getByRole('textbox', { name: 'auditFilterAgent' }), {
      target: { value: 'manager' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'filterApply' }));

    openChip('auditFilterFrom');
    fireEvent.change(screen.getByLabelText('auditFilterFrom', { selector: 'input' }), {
      target: { value: '2026-09-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'filterApply' }));

    const query = new URLSearchParams(currentSearch);
    expect(query.get('resourceType')).toBe('Practitioner');
    expect(query.get('agent')).toBe('manager');
    expect(query.get('from')).toBe('2026-09-01');
  });

  it('pages on the server and returns to the first page when a filter changes', () => {
    paged.current = state({ total: 25, hasNext: true });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(lastSearch().page).toBe(1);

    const before = usePagedSearchMock.mock.calls.length;
    const chip = screen.getByRole('combobox', { name: 'auditFilterAction' });
    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    fireEvent.keyDown(chip, { key: 'Enter' });

    const after = (usePagedSearchMock.mock.calls.slice(before) as [string, SearchOptions][]).filter(
      ([, options]) => options.params.action === 'C',
    );
    expect(after.length).toBeGreaterThan(0);
    expect(after.every(([, options]) => options.page === 0)).toBe(true);
  });

  it('keeps every filter and table control reachable from the keyboard', () => {
    renderPage();
    const controls = [
      screen.getByRole('combobox', { name: 'auditFilterAction' }),
      ...['auditFilterResourceType', 'auditFilterAgent', 'auditFilterFrom', 'auditFilterTo'].map(
        (name) => screen.getByRole('button', { name }),
      ),
      ...screen.getAllByRole('button', { name: /auditOpenDetails/ }),
    ];
    for (const control of controls) {
      expect(control.tagName).toBe('BUTTON');
      expect(control).not.toHaveAttribute('tabindex', '-1');
      control.focus();
      expect(control).toHaveFocus();
    }
  });

  it('has no serious or critical a11y violations, with and without the drawer', async () => {
    const { container } = renderPage();
    const isBlocking = (v: { impact?: string | null }) =>
      v.impact === 'serious' || v.impact === 'critical';
    const rules = { rules: { 'color-contrast': { enabled: false } } };

    expect((await axe(container, rules)).violations.filter(isBlocking)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: /"resource":"Location l1"/ }));
    expect((await axe(document.body, rules)).violations.filter(isBlocking)).toEqual([]);
  });
});
