import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

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
