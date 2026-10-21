import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type BulkImportState } from './useBulkImport';
import { type ImportOutcome, type ImportResult } from './importStream';
import { FhirError } from 'ohs-player-web-core';

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

const mockStart = vi.fn<(file: File) => Promise<ImportOutcome | null>>();
const mockReset = vi.fn();
let hookState: Omit<BulkImportState, 'start' | 'reset'>;

vi.mock('./useBulkImport', () => ({
  useBulkImport: (): BulkImportState => ({ ...hookState, start: mockStart, reset: mockReset }),
}));

const mockAudit = vi.fn<(fileName: string, outcome: ImportOutcome) => Promise<void>>();

vi.mock('./useImportAudit', () => ({
  useImportAudit: () => mockAudit,
}));

const { BulkImportDrawer } = await import('./BulkImportDrawer');
const { buildImportTemplateCsv, locationTemplate, organizationTemplate, userTemplate } =
  await import('./importTemplates');

const idle: Omit<BulkImportState, 'start' | 'reset'> = {
  phase: 'idle',
  progress: { processed: 0, total: 0 },
  result: null,
  failure: null,
};

function success(result: Partial<ImportResult>): Omit<BulkImportState, 'start' | 'reset'> {
  return {
    ...idle,
    phase: 'success',
    result: { processed: 3, failed: 0, total: 3, rowErrors: [], outcome: 'completed', ...result },
  };
}

function renderDrawer(onComplete = vi.fn(), onClose = vi.fn()) {
  render(
    <BulkImportDrawer template={locationTemplate} open onClose={onClose} onComplete={onComplete} />,
  );
  return { onComplete, onClose };
}

function pickFile(file = new File(['name\nKenya\n'], 'l.csv', { type: 'text/csv' })): void {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('file input missing');
  fireEvent.change(input, { target: { files: [file] } });
}

async function submitAndSettle(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /bulkImportStart/ }));
  await vi.waitFor(() => expect(mockStart).toHaveBeenCalled());
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  hookState = idle;
  mockStart.mockReset();
  mockReset.mockReset();
  mockAudit.mockReset().mockResolvedValue(undefined);
});

describe('buildImportTemplateCsv', () => {
  it('has the exact backend column header and only backend-accepted example values', () => {
    const [header, ...rows] = buildImportTemplateCsv(locationTemplate).trim().split('\n');
    expect(header).toBe(
      'name,id,physical_type,level,latitude,longitude,source_id,parent_id,source_parent_id,org_id,source_org_id',
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.split(',')).toHaveLength(11);
    }
    expect(rows[1]).toContain('KE');
  });
});

describe('BulkImportDrawer', () => {
  it('renders upload + columns sections with a template download and a form-wired submit', () => {
    renderDrawer();
    expect(screen.getByText('bulkImportUploadFile')).toBeInTheDocument();
    expect(screen.getByText('bulkImportExpectedColumns')).toBeInTheDocument();
    expect(screen.getByText('name*')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulkImportDownloadTemplate/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulkImportStart/ })).toHaveAttribute(
      'form',
      'location-import-form',
    );
  });

  it('shows the counts of a completed import', () => {
    hookState = success({ processed: 48, failed: 0, total: 48 });
    renderDrawer();
    expect(screen.getByText('bulkImportComplete')).toBeInTheDocument();
    expect(screen.getAllByText('48', { selector: 'dd' })).toHaveLength(2);
    expect(screen.queryByText('bulkImportRowErrors')).not.toBeInTheDocument();
  });

  it('lists row errors and says the import continued', () => {
    hookState = success({
      processed: 1,
      failed: 2,
      outcome: 'continued',
      rowErrors: [
        { row: 2, message: 'Parent organization not found: 9' },
        { row: 3, message: 'name is required' },
      ],
    });
    renderDrawer();
    expect(screen.getByText('bulkImportPartial')).toBeInTheDocument();
    expect(screen.getByText(/^bulkImportContinued/)).toBeInTheDocument();
    expect(
      screen.getByText('bulkImportRowError {"row":2,"message":"Parent organization not found: 9"}'),
    ).toBeInTheDocument();
  });

  it('says where a stopped import stopped', () => {
    hookState = success({
      processed: 2,
      failed: 1,
      outcome: 'stopped',
      stoppedAtRow: 3,
      rowErrors: [{ row: 3, message: 'Group not found: nurses' }],
    });
    renderDrawer();
    expect(screen.getByText('bulkImportStoppedTitle')).toBeInTheDocument();
    expect(screen.getByText('bulkImportStopped {"row":3}')).toBeInTheDocument();
  });

  it('caps the visible row errors at ten and counts the rest', () => {
    const rowErrors = Array.from({ length: 13 }, (_, i) => ({ row: i + 1, message: 'bad' }));
    hookState = success({ failed: 13, outcome: 'continued', rowErrors });
    renderDrawer();
    expect(screen.getAllByText(/^bulkImportRowError /)).toHaveLength(10);
    expect(screen.getByText('bulkImportMoreErrors {"count":3}')).toBeInTheDocument();
  });

  it('shows a request failure and an interrupted stream in the error block', () => {
    hookState = {
      ...idle,
      phase: 'error',
      failure: {
        kind: 'request',
        error: new FhirError('Insufficient permissions', 403, { error: 'x' }),
      },
    };
    const { unmount } = render(
      <BulkImportDrawer template={locationTemplate} open onClose={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('errorCauseForbidden bulkImportNothingImported')).toBeInTheDocument();
    expect(screen.getByText('errorTechnicalDetails').closest('details')).toHaveTextContent(
      'Insufficient permissions',
    );
    unmount();

    hookState = {
      ...idle,
      phase: 'error',
      failure: { kind: 'interrupted', processed: 50, rowErrors: [{ row: 51, message: 'boom' }] },
    };
    renderDrawer();
    expect(screen.getByText('bulkImportStreamInterrupted {"processed":50}')).toBeInTheDocument();
    expect(screen.getByText('bulkImportRowError {"row":51,"message":"boom"}')).toBeInTheDocument();
  });

  it('cannot be closed while an import is streaming', () => {
    hookState = { ...idle, phase: 'uploading', progress: { processed: 2, total: 10 } };
    const { onClose } = renderDrawer();
    const closeButton = screen.getByRole('button', { name: 'close' });
    expect(closeButton).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('refreshes the page and writes one audit event after a completed import', async () => {
    const outcome: ImportOutcome = { ok: true, result: success({}).result as ImportResult };
    mockStart.mockResolvedValue(outcome);
    const { onComplete } = renderDrawer();
    pickFile();
    await submitAndSettle();
    expect(mockStart).toHaveBeenCalledWith(expect.any(File));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledWith('l.csv', outcome);
  });

  it('audits an interrupted import that already wrote rows', async () => {
    mockStart.mockResolvedValue({
      ok: false,
      failure: { kind: 'interrupted', processed: 50, rowErrors: [] },
    });
    const { onComplete } = renderDrawer();
    pickFile();
    await submitAndSettle();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the page when the upload is rejected before any row', async () => {
    mockStart.mockResolvedValue({
      ok: false,
      failure: { kind: 'request', error: new Error('HTTP 400') },
    });
    const { onComplete } = renderDrawer();
    pickFile();
    await submitAndSettle();
    expect(mockStart).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('writes no audit event for a stream that reported nothing', async () => {
    mockStart.mockResolvedValue({ ok: false, failure: { kind: 'empty' } });
    renderDrawer();
    pickFile();
    await submitAndSettle();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('rejects a CSV and a workbook with the wrong header with the same message', async () => {
    const message = 'bulkImportMissingColumns {"columns":"name"}';

    const { unmount } = render(
      <BulkImportDrawer
        template={organizationTemplate}
        open
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    pickFile(new File(['Name,source_id\nMOH,MOH\n'], 'orgs.csv', { type: 'text/csv' }));
    fireEvent.click(screen.getByRole('button', { name: /bulkImportStart/ }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    unmount();

    render(
      <BulkImportDrawer
        template={organizationTemplate}
        open
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    pickFile(
      new File(
        [readFileSync(resolve(__dirname, '__fixtures__', 'wrong-header.xlsx'))],
        'orgs.xlsx',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /bulkImportStart/ }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('shows the initial load warning for the users template', () => {
    render(
      <BulkImportDrawer template={userTemplate} open onClose={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('usersImportWarning')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulkImportStart/ })).toHaveAttribute(
      'form',
      'user-import-form',
    );
  });

  it('has no critical a11y violations idle or with a result', async () => {
    const { unmount } = render(
      <BulkImportDrawer template={locationTemplate} open onClose={vi.fn()} onComplete={vi.fn()} />,
    );
    const idleResult = await axe(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(idleResult.violations.filter((v) => v.impact === 'critical')).toEqual([]);
    unmount();

    hookState = success({
      failed: 1,
      outcome: 'continued',
      rowErrors: [{ row: 2, message: 'bad' }],
    });
    renderDrawer();
    const doneResult = await axe(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(doneResult.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
