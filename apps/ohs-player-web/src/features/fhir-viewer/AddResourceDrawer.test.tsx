import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { state } = vi.hoisted(() => ({
  state: {
    createSpy: vi.fn(),
    updateSpy: vi.fn(),
    auditSpy: vi.fn(),
    notifySpy: vi.fn(),
    refreshSpy: vi.fn(),
  },
}));

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: object) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
      dir: 'ltr',
      locale: 'en',
    }),
    useCreateResource: () => ({ mutateAsync: state.createSpy, isPending: false }),
    useUpdateResource: () => ({ mutateAsync: state.updateSpy, isPending: false }),
    useRefreshResources: () => state.refreshSpy,
    useStatusBar: () => ({ notify: state.notifySpy, saving: () => ({ succeeded() {}, failed() {} }) }),
    useFhirClient: () => ({}),
    useAuth: () => ({ user: { preferred_username: 'tester' } }),
    writeAuditEvent: (...args: unknown[]) => state.auditSpy(...args) as unknown,
  };
});

const { AddResourceDrawer } = await import('./AddResourceDrawer');
const { resourceTypeDef } = await import('./registry');

const org = resourceTypeDef('Organization')!;

const jsonField = () => screen.getByLabelText<HTMLTextAreaElement>('fhirViewerJsonLabel');
const addButton = () => screen.getByRole('button', { name: 'fhirViewerAddSubmit' });

beforeEach(() => {
  vi.clearAllMocks();
  state.createSpy.mockResolvedValue({ resourceType: 'Organization', id: 'server-assigned' });
  state.updateSpy.mockResolvedValue({});
});
afterEach(cleanup);

function renderDrawer(onClose = vi.fn()) {
  render(<AddResourceDrawer def={org} open onClose={onClose} />);
  return onClose;
}

describe('AddResourceDrawer', () => {
  it('starts empty with Add disabled', () => {
    renderDrawer();
    expect(jsonField().value).toBe('');
    expect(addButton()).toBeDisabled();
  });

  it('quick add fills a valid template with a freshly generated unique id', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /fhirViewerQuickAdd/ }));

    const parsed = JSON.parse(jsonField().value) as { resourceType: string; id: string };
    expect(parsed.resourceType).toBe('Organization');
    expect(parsed.id).not.toBe('example');
    expect(parsed.id.length).toBeGreaterThan(8);
    expect(addButton()).toBeEnabled();
  });

  it('generates a different id on each quick add', () => {
    renderDrawer();
    const quick = screen.getByRole('button', { name: /fhirViewerQuickAdd/ });
    fireEvent.click(quick);
    const first = (JSON.parse(jsonField().value) as { id: string }).id;
    fireEvent.click(quick);
    const second = (JSON.parse(jsonField().value) as { id: string }).id;
    expect(second).not.toBe(first);
  });

  it('rejects invalid JSON and keeps Add disabled', () => {
    renderDrawer();
    fireEvent.change(jsonField(), { target: { value: '{ not json' } });
    expect(screen.getByText(/fhirViewerAddInvalidJson/)).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('rejects a resourceType that does not match the selected type', () => {
    renderDrawer();
    fireEvent.change(jsonField(), { target: { value: JSON.stringify({ resourceType: 'Patient' }) } });
    expect(screen.getByText(/fhirViewerAddTypeMismatch/)).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('PUTs at the supplied id, writes a create AuditEvent, refreshes and closes', async () => {
    const onClose = renderDrawer();
    fireEvent.change(jsonField(), {
      target: { value: JSON.stringify({ resourceType: 'Organization', id: 'abc-123', name: 'Acme' }) },
    });
    fireEvent.click(addButton());

    await waitFor(() =>
      expect(state.updateSpy).toHaveBeenCalledWith({
        id: 'abc-123',
        body: { resourceType: 'Organization', id: 'abc-123', name: 'Acme' },
      }),
    );
    expect(state.createSpy).not.toHaveBeenCalled();
    expect(state.auditSpy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'create', resourceType: 'Organization', resourceId: 'abc-123' }),
    );
    await waitFor(() => expect(state.refreshSpy).toHaveBeenCalledWith('Organization'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('POSTs when there is no id and audits the server-assigned id', async () => {
    renderDrawer();
    fireEvent.change(jsonField(), {
      target: { value: JSON.stringify({ resourceType: 'Organization', name: 'Acme' }) },
    });
    fireEvent.click(addButton());

    await waitFor(() => expect(state.createSpy).toHaveBeenCalled());
    expect(state.updateSpy).not.toHaveBeenCalled();
    expect(state.auditSpy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'create', resourceId: 'server-assigned' }),
    );
  });

  it('surfaces a server failure inline and keeps the drawer open', async () => {
    const onClose = renderDrawer();
    state.createSpy.mockRejectedValue(new Error('duplicate identifier'));
    fireEvent.change(jsonField(), {
      target: { value: JSON.stringify({ resourceType: 'Organization', name: 'Acme' }) },
    });
    fireEvent.click(addButton());

    await waitFor(() => expect(screen.getByText('duplicate identifier')).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(state.auditSpy).not.toHaveBeenCalled();
  });
});
