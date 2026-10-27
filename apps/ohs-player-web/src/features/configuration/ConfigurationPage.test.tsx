import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedPortalConfig } from '../../config/loadPortalConfig';

const mockWriteAuditEvent = vi.fn();
const mockNotify = vi.fn();
const mockDownloadDocument = vi.fn();

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
    useFhirClient: () => ({}),
    useAuth: () => ({ status: 'authenticated', user: { preferred_username: 'tester' } }),
    useStatusBar: () => ({ notify: mockNotify }),
    writeAuditEvent: (...args: unknown[]): unknown => mockWriteAuditEvent(...args),
  };
});

vi.mock(
  './downloadConfig',
  async (): Promise<object> => ({
    ...(await vi.importActual<object>('./downloadConfig')),
    downloadDocument: (...args: unknown[]): unknown => mockDownloadDocument(...args),
  }),
);

const { ConfigurationPage } = await import('./ConfigurationPage');
const { RunningConfigContext } = await import('./RunningConfigContext');

const RUNNING = { product: { name: 'OHS' }, locale: 'en', flags: { auditLog: true } };

function renderPage(running: LoadedPortalConfig = { document: RUNNING, source: 'document' }) {
  return render(
    <MemoryRouter>
      <RunningConfigContext.Provider value={running}>
        <ConfigurationPage />
      </RunningConfigContext.Provider>
    </MemoryRouter>,
  );
}

const editor = () => screen.getByLabelText<HTMLTextAreaElement>('configEditorLabel');
const downloadButton = () => screen.getByRole('button', { name: 'configDownload' });
const changesSection = () => screen.getByRole('region', { name: 'configChangesTitle' });

function edit(document: unknown) {
  fireEvent.change(editor(), {
    target: { value: typeof document === 'string' ? document : JSON.stringify(document) },
  });
}

describe('ConfigurationPage', () => {
  beforeEach(() => {
    mockWriteAuditEvent.mockReset().mockResolvedValue({ id: 'ae1' });
    mockNotify.mockReset();
    mockDownloadDocument.mockReset();
  });

  it('opens on the running document with no changes and nothing to download', () => {
    renderPage();

    expect(JSON.parse(editor().value)).toEqual(RUNNING);
    expect(within(changesSection()).getByText('configNoChanges')).toBeInTheDocument();
    expect(downloadButton()).toBeDisabled();
  });

  it('says when the text is not JSON and keeps download off', () => {
    renderPage();
    edit('{ "locale": ');

    expect(screen.getByRole('alert')).toHaveTextContent('configInvalidJson');
    expect(editor()).toHaveAttribute('aria-invalid', 'true');
    expect(within(changesSection()).getByText('configChangesUnavailable')).toBeInTheDocument();
    expect(downloadButton()).toBeDisabled();
  });

  it('says when the JSON is not an object', () => {
    renderPage();
    edit('[]');

    expect(screen.getByRole('alert')).toHaveTextContent('configNotAnObject');
    expect(downloadButton()).toBeDisabled();
  });

  it('lists each schema issue by its path, linked to the editor', () => {
    renderPage();
    edit({ ...RUNNING, flags: { auditLog: 'yes' }, colour: 'red' });

    expect(screen.getByRole('alert')).toHaveTextContent('configIssueCount {"count":2}');
    const issues = document.getElementById(editor().getAttribute('aria-describedby') ?? '');
    expect(issues).toHaveTextContent('flags.auditLog');
    expect(issues).toHaveTextContent('configIssueTopLevel');
    expect(issues).toHaveTextContent('Unrecognized key: "colour"');
    expect(downloadButton()).toBeDisabled();
  });

  it('shows exactly what changed against the running document', () => {
    renderPage();
    edit({ ...RUNNING, locale: 'sw', flags: { auditLog: true, dashboard: false } });

    const [locale, dashboard] = within(changesSection()).getAllByRole('listitem');
    expect(locale).toHaveTextContent('configChangeChanged');
    expect(within(locale).getByText('locale')).toBeInTheDocument();
    expect(within(locale).getByText('"en"')).toBeInTheDocument();
    expect(within(locale).getByText('"sw"')).toBeInTheDocument();
    expect(dashboard).toHaveTextContent('configChangeAdded');
    expect(within(dashboard).getByText('flags.dashboard')).toBeInTheDocument();
    expect(within(dashboard).getByText('false')).toBeInTheDocument();
    expect(within(dashboard).queryByText('configChangeBefore')).not.toBeInTheDocument();
    expect(downloadButton()).toBeEnabled();
  });

  it('downloads the document and audits it as an export of a system object', async () => {
    renderPage();
    edit({ ...RUNNING, locale: 'sw' });
    fireEvent.click(downloadButton());

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    expect(mockDownloadDocument).toHaveBeenCalledWith({ ...RUNNING, locale: 'sw' });
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      {},
      {
        action: 'execute',
        entityType: {
          system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
          code: '2',
          display: 'System Object',
        },
        description: 'portal-config.json downloaded with 1 change: locale',
        agentDisplay: 'tester',
      },
    );
    expect(mockNotify).toHaveBeenCalledWith({ tone: 'success', title: 'configDownloaded' });
  });

  it('still hands over the file when the audit record fails, and says so', async () => {
    mockWriteAuditEvent.mockRejectedValue(new Error('HAPI down'));
    renderPage();
    edit({ ...RUNNING, locale: 'sw' });
    fireEvent.click(downloadButton());

    await waitFor(() =>
      expect(mockNotify).toHaveBeenCalledWith({
        tone: 'warning',
        title: 'configDownloaded',
        description: 'configAuditFailed',
      }),
    );
    expect(mockDownloadDocument).toHaveBeenCalledOnce();
  });

  it('marks a hand edit of a guarded field for engineering review without blocking it', () => {
    renderPage();
    edit({ ...RUNNING, oidcIssuer: 'https://idp.example/realms/ohs' });

    expect(within(changesSection()).getAllByText('configGuardedChange')).toHaveLength(2);
    expect(within(changesSection()).getByText('configGuardedNotice')).toBeInTheDocument();
    expect(downloadButton()).toBeEnabled();
  });

  it('resets the editor to the running document', () => {
    renderPage();
    edit('{');
    fireEvent.click(screen.getByRole('button', { name: 'configReset' }));

    expect(JSON.parse(editor().value)).toEqual(RUNNING);
  });

  it('says when the session runs on the last valid copy, with the load error behind details', () => {
    renderPage({ document: RUNNING, source: 'last-good', error: '✖ Invalid input\n  → at locale' });

    expect(screen.getByText('configSourceLastGood')).toBeInTheDocument();
    expect(screen.getByText(/at locale/)).toBeInTheDocument();
  });

  it('starts from an empty document when the session runs on built-in settings', () => {
    renderPage({ source: 'baked' });

    expect(screen.getByText('configSourceBaked')).toBeInTheDocument();
    expect(JSON.parse(editor().value)).toEqual({});
  });

  it('has no serious accessibility violations with issues and changes on screen', async () => {
    const { container } = renderPage();
    edit({ ...RUNNING, locale: 'sw', colour: 'red' });

    const results = await axe(container);
    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(blocking).toEqual([]);
  });
});
