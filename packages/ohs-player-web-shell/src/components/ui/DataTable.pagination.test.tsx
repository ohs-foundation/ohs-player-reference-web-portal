import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DataTableServerPagination } from './DataTable';

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
  };
});

const { DataTable } = await import('./DataTable');

type Row = { id: string };
const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}` }));
const columns = [{ key: 'id', header: 'ID', render: (r: Row) => r.id }];

function table(pageResetKey: string) {
  return (
    <DataTable<Row>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      pagination
      pageResetKey={pageResetKey}
    />
  );
}

describe('DataTable pageResetKey', () => {
  it('snaps back to page 1 when the reset key changes', () => {
    const { rerender } = render(table('unfiltered'));

    fireEvent.click(screen.getByRole('button', { name: 'paginationNext' }));
    expect(screen.getAllByText(/tableShowing.*"start":11/).length).toBeGreaterThan(0);

    rerender(table('status=active'));
    expect(screen.getAllByText(/tableShowing.*"start":1,/).length).toBeGreaterThan(0);
  });
});

function clientTable(count: number, extra: Record<string, unknown> = {}) {
  const many: Row[] = Array.from({ length: count }, (_, i) => ({ id: `r${i}` }));
  return (
    <DataTable<Row> columns={columns} rows={many} rowKey={(r) => r.id} pagination {...extra} />
  );
}

function pageButtons(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((text) => /^\d+$/.test(text));
}

describe('DataTable client pagination footer', () => {
  it('shows the range in the footer and in a status region', () => {
    render(clientTable(30));
    const summary = 'tableShowing {"start":1,"end":10,"total":30}';
    expect(screen.getByRole('status')).toHaveTextContent(summary);
    expect(screen.getAllByText(summary)).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  it('disables previous on the first page and next on the last, marking the current page', () => {
    render(clientTable(30));
    expect(screen.getByRole('button', { name: 'paginationPrev' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByRole('button', { name: 'paginationNext' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'paginationPrev' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('status')).toHaveTextContent('"start":21,"end":30');
  });

  it('shows a window of at most five page numbers around the current page', () => {
    render(clientTable(100));
    expect(pageButtons()).toEqual(['1', '2', '3', '4', '5']);

    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));

    expect(pageButtons()).toEqual(['5', '6', '7', '8', '9']);
  });

  it('changes the page size from the items-per-page listbox and returns to page 1', () => {
    render(clientTable(60));
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    fireEvent.click(screen.getByRole('combobox', { name: /tableItemsPerPage/ }));
    fireEvent.click(screen.getByRole('option', { name: '25' }));

    expect(screen.getByRole('status')).toHaveTextContent('"start":1,"end":25,"total":60');
    expect(pageButtons()).toEqual(['1', '2', '3']);
  });

  it('hides the footer without rows or on error, and the status region while loading', () => {
    const { rerender } = render(clientTable(0));
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();

    rerender(clientTable(30, { loading: true }));
    expect(screen.queryByRole('status')).toBeNull();

    rerender(clientTable(30, { errorState: <p>boom</p> }));
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

function serverTable(
  server: Partial<DataTableServerPagination>,
  pageRows: Row[] = rows.slice(0, 10),
  extra: Record<string, unknown> = {},
) {
  return (
    <DataTable<Row>
      columns={columns}
      rows={pageRows}
      rowKey={(r) => r.id}
      pagination
      serverPagination={{
        page: 0,
        pageSize: 10,
        total: 25,
        hasNext: true,
        mode: 'numbered',
        onPageChange: vi.fn(),
        onPageSizeChange: vi.fn(),
        ...server,
      }}
      {...extra}
    />
  );
}

describe('DataTable server pagination', () => {
  it('renders the given rows unsliced with the server range and page count', () => {
    render(serverTable({ page: 1 }, rows.slice(10, 20)));
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('r10')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'tableShowing {"start":11,"end":20,"total":25}',
    );
    expect(pageButtons()).toEqual(['1', '2', '3']);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
  });

  it('reports 0-based pages and page size changes to the owner', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(serverTable({ page: 1, onPageChange, onPageSizeChange }, rows.slice(10, 20)));

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'paginationPrev' }));
    fireEvent.click(screen.getByRole('button', { name: 'paginationNext' }));
    fireEvent.click(screen.getByRole('combobox', { name: /tableItemsPerPage/ }));
    fireEvent.click(screen.getByRole('option', { name: '50' }));

    expect(onPageChange.mock.calls).toEqual([[2], [0], [2]]);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('degrades to a range with previous/next only in links mode', () => {
    render(serverTable({ mode: 'links', total: undefined, hasNext: false }));
    expect(screen.getByRole('status')).toHaveTextContent('tableShowingRange {"start":1,"end":10}');
    expect(pageButtons()).toEqual([]);
    expect(screen.getByRole('button', { name: 'paginationNext' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'paginationPrev' })).toBeDisabled();
  });

  it('uses the range form when a numbered mode arrives without a total', () => {
    render(serverTable({ total: undefined }));
    expect(screen.getByRole('status')).toHaveTextContent('tableShowingRange');
  });

  it('hides the footer and status with no rows, while loading and on error', () => {
    const { rerender } = render(serverTable({}, []));
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();

    rerender(serverTable({}, rows.slice(0, 10), { loading: true }));
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();

    rerender(serverTable({}, rows.slice(0, 10), { errorState: <p>boom</p> }));
    expect(screen.queryByRole('button', { name: 'paginationNext' })).toBeNull();
  });
});
