import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedPortalConfig } from '../../config/loadPortalConfig';

const mockWriteAuditEvent = vi.fn();
const mockNotify = vi.fn();
const mockDownloadDocument = vi.fn();
const mockAssistPost = vi.fn();
let flagsOn = new Set<string>();

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
    useFlag: (flag: string) => flagsOn.has(flag),
    useCustomEndpoint: (alias: string) => ({
      post: { mutateAsync: (body: unknown): unknown => mockAssistPost(alias, body) },
    }),
  };
});

vi.mock(
  './downloadConfig',
  async (): Promise<object> => ({
    ...(await vi.importActual<object>('./downloadConfig')),
    downloadDocument: (...args: unknown[]): unknown => mockDownloadDocument(...args),
  }),
);

const { FhirError, installThemeCss } = await import('ohs-player-web-core');
const { createPortalHost, PortalConfigContext } = await import('ohs-player-web-shell');
const { portalDefaults } = await import('../../config/platform');
const { ConfigurationPage } = await import('./ConfigurationPage');
const { RunningConfigContext } = await import('./RunningConfigContext');

const { portal } = createPortalHost({ defaults: portalDefaults, development: true });
const themeText = () => document.getElementById('ohs-theme-tokens')?.textContent ?? '';

const RUNNING = { product: { name: 'OHS' }, locale: 'en', flags: { auditLog: true } };

function renderPage(running: LoadedPortalConfig = { document: RUNNING, source: 'document' }) {
  return render(
    <MemoryRouter>
      <PortalConfigContext.Provider value={portal}>
        <RunningConfigContext.Provider value={running}>
          <ConfigurationPage />
        </RunningConfigContext.Provider>
      </PortalConfigContext.Provider>
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
    mockAssistPost.mockReset();
    flagsOn = new Set();
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

describe('ConfigurationPage preview', () => {
  const previewButton = () => screen.getByRole('button', { name: 'configPreview' });
  const draftBrand = { overrides: { primary: '#0F766E' } };

  beforeEach(() => {
    installThemeCss(portal.theme);
  });

  it('applies the draft brand to the session and puts the running brand back on End preview', () => {
    renderPage();
    edit({ ...RUNNING, brand: draftBrand });
    fireEvent.click(previewButton());

    expect(themeText()).toContain('--ohs-sys-color-primary: #0F766E;');
    expect(screen.getByRole('status')).toHaveTextContent('configPreviewActive');

    fireEvent.click(screen.getByRole('button', { name: 'configPreviewEnd' }));

    expect(themeText()).toContain('--ohs-sys-color-primary: #094F9A;');
    expect(screen.queryByText('configPreviewActive')).not.toBeInTheDocument();
  });

  it('lists the draft sidebar in order and marks a screen the draft switches off', () => {
    renderPage();
    const audit = {
      id: 'audit',
      to: '/audit',
      labelKey: 'navAudit',
      order: 5,
      requires: { flag: 'auditLog', permission: 'audit.view' },
    };
    const users = { id: 'users', to: '/users', labelKey: 'navUsers', order: 10 };
    edit({ ...RUNNING, navigation: [users, audit], flags: { auditLog: false } });
    fireEvent.click(previewButton());

    const list = screen.getByRole('list', { name: 'configPreviewSidebar' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => within(item).getByText(/^\//).textContent)).toEqual([
      '/audit',
      '/users',
    ]);
    expect(items[0]).toHaveTextContent('configPreviewSwitchedOff');
    expect(items[1]).not.toHaveTextContent('configPreviewSwitchedOff');
  });

  it('ends the preview as soon as the draft is edited', () => {
    renderPage();
    edit({ ...RUNNING, brand: draftBrand });
    fireEvent.click(previewButton());
    edit({ ...RUNNING, brand: draftBrand, locale: 'sw' });

    expect(themeText()).toContain('--ohs-sys-color-primary: #094F9A;');
    expect(screen.queryByText('configPreviewActive')).not.toBeInTheDocument();
  });

  it('puts the running brand back when the page is left mid preview', () => {
    const { unmount } = renderPage();
    edit({ ...RUNNING, brand: draftBrand });
    fireEvent.click(previewButton());
    unmount();

    expect(themeText()).toContain('--ohs-sys-color-primary: #094F9A;');
  });

  it('previews only the brand, never connection or endpoint settings', () => {
    const before = themeText();
    renderPage();
    edit({
      ...RUNNING,
      oidcIssuer: 'https://idp.example/realms/ohs',
      customEndpoints: { users: '/relay/users' },
    });
    fireEvent.click(previewButton());

    expect(themeText()).toBe(before);
  });

  it('offers no preview for a draft that does not validate', () => {
    renderPage();
    edit({ ...RUNNING, flags: { auditLog: 'yes' } });

    expect(previewButton()).toBeDisabled();
  });
});

describe('ConfigurationPage assistant', () => {
  const askField = () => screen.getByLabelText('configAssistLabel');
  const askButton = () => screen.getByRole('button', { name: 'configAssistAsk' });
  const assistSection = () => screen.getByRole('region', { name: 'configAssistTitle' });

  function ask(request = 'Switch the portal to Swahili') {
    fireEvent.change(askField(), { target: { value: request } });
    fireEvent.click(askButton());
  }

  beforeEach(() => {
    flagsOn = new Set(['configAssist']);
    mockAssistPost.mockReset();
    mockNotify.mockReset();
  });

  it('leaves the page as it is without the configAssist flag, and never calls the relay', () => {
    flagsOn = new Set();
    renderPage();

    expect(screen.queryByRole('region', { name: 'configAssistTitle' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('configAssistLabel')).not.toBeInTheDocument();
    expect(editor()).toBeInTheDocument();
    expect(changesSection()).toBeInTheDocument();
    expect(mockAssistPost).not.toHaveBeenCalled();
  });

  it('sends the request, the draft and the schema, and nothing else, to the configAssist alias', async () => {
    mockAssistPost.mockResolvedValue({ proposal: { ...RUNNING, locale: 'sw' } });
    renderPage();
    ask('  Switch the portal to Swahili  ');

    await waitFor(() => expect(mockAssistPost).toHaveBeenCalledOnce());
    const [alias, body] = mockAssistPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(alias).toBe('configAssist');
    expect(Object.keys(body).sort()).toEqual(['document', 'request', 'schema']);
    expect(body.request).toBe('Switch the portal to Swahili');
    expect(body.document).toEqual(RUNNING);
    expect(body.schema).toMatchObject({ type: 'object', additionalProperties: false });
  });

  it('places a valid proposal in the editor, where it is checked, diffed and downloadable', async () => {
    mockAssistPost.mockResolvedValue({
      proposal: { ...RUNNING, locale: 'sw' },
      summary: 'Switched the locale to Swahili.',
    });
    renderPage();
    ask();

    await waitFor(() => expect(JSON.parse(editor().value)).toEqual({ ...RUNNING, locale: 'sw' }));
    expect(within(changesSection()).getByText('locale')).toBeInTheDocument();
    expect(downloadButton()).toBeEnabled();
    expect(
      within(assistSection()).getByText('Switched the locale to Swahili.'),
    ).toBeInTheDocument();
    expect(mockNotify).toHaveBeenCalledWith({ tone: 'info', title: 'configAssistPlaced' });
  });

  it('records a downloaded proposal as proposed by the assistant', async () => {
    mockAssistPost.mockResolvedValue({ proposal: { ...RUNNING, locale: 'sw' } });
    renderPage();
    ask();
    await waitFor(() => expect(downloadButton()).toBeEnabled());
    fireEvent.click(downloadButton());

    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalled());
    expect(mockWriteAuditEvent.mock.calls[0][1]).toMatchObject({
      description: 'portal-config.json downloaded with 1 change proposed by the assistant: locale',
    });
  });

  it('shows the field errors of an invalid proposal, blocks download and can restore the draft', async () => {
    mockAssistPost.mockResolvedValue({ proposal: { ...RUNNING, flags: { auditLog: 'yes' } } });
    renderPage();
    ask();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('configIssueCount'));
    const issues = document.getElementById(editor().getAttribute('aria-describedby') ?? '');
    expect(issues).toHaveTextContent('flags.auditLog');
    expect(downloadButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'configAssistRestore' }));
    expect(JSON.parse(editor().value)).toEqual(RUNNING);
  });

  it('explains a provider failure in plain words and leaves the editor alone', async () => {
    mockAssistPost.mockRejectedValue(new FhirError('upstream model timed out', 502, undefined));
    renderPage();
    const before = editor().value;
    ask();

    const failure = await within(assistSection()).findByRole('alert');
    expect(failure).toHaveTextContent('configAssistFailedTitle');
    expect(failure).toHaveTextContent('errorCauseServer');
    expect(failure).toHaveTextContent('upstream model timed out');
    expect(editor().value).toBe(before);
  });

  it.each([404, 503])(
    'says the assistant is not set up when the relay answers %i',
    async (code) => {
      mockAssistPost.mockRejectedValue(new FhirError('Not Found', code, undefined));
      renderPage();
      ask();

      const failure = await within(assistSection()).findByRole('alert');
      expect(failure).toHaveTextContent('configAssistUnavailableTitle');
      expect(failure).toHaveTextContent('configAssistUnavailable');
    },
  );

  it.each([
    { reply: { proposal: '{"locale":"sw"}' } },
    { reply: { proposal: [RUNNING] } },
    { reply: null },
    { reply: { summary: 'Done' } },
  ])('refuses a reply that is not a configuration document: $reply', async ({ reply }) => {
    mockAssistPost.mockResolvedValue(reply);
    renderPage();
    const before = editor().value;
    ask();

    const failure = await within(assistSection()).findByRole('alert');
    expect(failure).toHaveTextContent('configAssistNotADocument');
    expect(editor().value).toBe(before);
  });

  it.each([
    { field: 'oidcIssuer', change: { oidcIssuer: 'https://idp.example/realms/ohs' } },
    { field: 'permissionMap', change: { permissionMap: { 'users.edit': ['nurse'] } } },
    { field: 'customEndpoints', change: { customEndpoints: { users: '/relay/users' } } },
  ])('refuses a proposal that changes $field and names it', async ({ field, change }) => {
    mockAssistPost.mockResolvedValue({ proposal: { ...RUNNING, ...change } });
    renderPage();
    const before = editor().value;
    ask();

    const failure = await within(assistSection()).findByRole('alert');
    expect(failure).toHaveTextContent('configAssistGuardedTitle');
    expect(failure).toHaveTextContent(field);
    expect(editor().value).toBe(before);
  });

  it('judges guarded fields against the draft it sent, not the running document', async () => {
    renderPage();
    const handEdit = { ...RUNNING, oidcIssuer: 'https://idp.example/realms/ohs' };
    edit(handEdit);
    mockAssistPost.mockResolvedValue({ proposal: { ...handEdit, locale: 'sw' } });
    ask();

    await waitFor(() => expect(JSON.parse(editor().value)).toEqual({ ...handEdit, locale: 'sw' }));
  });

  it('locks the editor and the Ask button while the assistant works', async () => {
    let answer: (value: unknown) => void = () => undefined;
    mockAssistPost.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderPage();
    ask();

    expect(await screen.findByText('configAssistPending')).toBeInTheDocument();
    expect(editor()).toHaveAttribute('readonly');
    expect(askButton()).toBeDisabled();

    answer({ proposal: { ...RUNNING, locale: 'sw' } });
    await waitFor(() => expect(editor()).not.toHaveAttribute('readonly'));
    expect(screen.queryByText('configAssistPending')).not.toBeInTheDocument();
  });

  it('keeps Ask off for an empty request or a draft that does not validate', () => {
    renderPage();
    expect(askButton()).toBeDisabled();

    fireEvent.change(askField(), { target: { value: 'Hide the setup wizard' } });
    expect(askButton()).toBeEnabled();

    edit('{');
    expect(askButton()).toBeDisabled();
    expect(screen.getByText('configAssistDraftInvalid')).toBeInTheDocument();
  });

  it('has no serious accessibility violations with the assistant shown', async () => {
    mockAssistPost.mockRejectedValue(new FhirError('Bad Gateway', 502, undefined));
    const { container } = renderPage();
    ask();
    await within(assistSection()).findByRole('alert');

    const results = await axe(container);
    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(blocking).toEqual([]);
  });
});
