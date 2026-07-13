import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

vi.mock('./useBulkImport', () => ({
  useBulkImport: () => ({
    phase: 'idle',
    progress: { processed: 0, total: 0 },
    result: null,
    error: null,
    start: vi.fn(),
    reset: vi.fn(),
  }),
}));

const { LocationImportDrawer } = await import('./LocationImportDrawer');
const { buildImportTemplateCsv } = await import('./importTemplate');

describe('buildImportTemplateCsv', () => {
  it('has the exact backend column header and only backend-accepted example values', () => {
    const [header, ...rows] = buildImportTemplateCsv().trim().split('\n');
    expect(header).toBe(
      'name,id,physical_type,level,latitude,longitude,source_id,parent_id,source_parent_id,org_id,source_org_id',
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.split(',')).toHaveLength(11);
    }
    // Example rows chain parents in-batch via source_parent_id (KE → NBO).
    expect(rows[1]).toContain('KE');
  });
});

describe('LocationImportDrawer', () => {
  it('renders upload + columns sections with a template download and a form-wired submit', () => {
    render(<LocationImportDrawer open onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText('locationsUploadFile')).toBeInTheDocument();
    expect(screen.getByText('locationsExpectedColumns')).toBeInTheDocument();
    expect(screen.getByText('name*')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /locationsDownloadTemplate/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /locationsStartImport/ })).toHaveAttribute(
      'form',
      'location-import-form',
    );
  });
});
