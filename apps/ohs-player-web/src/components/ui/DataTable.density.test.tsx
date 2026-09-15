import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { DataTable } = await import('./DataTable');

const rows = [{ id: '1', name: 'Alpha' }];
const columns = [{ key: 'name', header: 'Name', render: (r: (typeof rows)[number]) => r.name }];

function renderTable(density?: 0 | -1 | -2) {
  return render(
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} density={density} />,
  );
}

describe('DataTable density', () => {
  it('sets no density attribute at the default scale', () => {
    const { container } = renderTable();
    expect(container.querySelector('.ohs-table-wrapper')).not.toHaveAttribute('data-density');
  });

  it.each([-1, -2] as const)('exposes density %s on the wrapper', (density) => {
    const { container } = renderTable(density);
    expect(container.querySelector('.ohs-table-wrapper')).toHaveAttribute(
      'data-density',
      String(density),
    );
  });

  it('keeps rendering rows at every density', () => {
    renderTable(-2);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
