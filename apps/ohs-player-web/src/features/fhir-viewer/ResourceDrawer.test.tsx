import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { state } = vi.hoisted(() => ({
  state: {
    resource: { resourceType: 'Organization', id: 'o1', name: 'Acme', meta: { versionId: '1' } },
    updateSpy: vi.fn(),
    delSpy: vi.fn(),
    auditSpy: vi.fn(),
    notifySpy: vi.fn(),
    refreshSpy: vi.fn(),
    refetchSpy: vi.fn(),
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
    useResource: () => ({
      data: state.resource,
      isLoading: false,
      error: null,
      refetch: state.refetchSpy,
      dataUpdatedAt: 1,
    }),
    useUpdateResource: () => ({ mutateAsync: state.updateSpy, isPending: false }),
    useDeleteResource: () => ({ mutateAsync: state.delSpy, isPending: false }),
    useRefreshResources: () => state.refreshSpy,
    useStatusBar: () => ({ notify: state.notifySpy, saving: () => ({ succeeded() {}, failed() {} }) }),
    useFhirClient: () => ({}),
    useAuth: () => ({ user: { preferred_username: 'tester' } }),
    writeAuditEvent: (...args: unknown[]) => state.auditSpy(...args) as unknown,
    usePermission: () => ({ can: true, isLoading: false }),
  };
});

const { ResourceDrawer } = await import('./ResourceDrawer');
const { resourceTypeDef } = await import('./registry');

const org = resourceTypeDef('Organization')!;

beforeEach(() => {
  state.resource = { resourceType: 'Organization', id: 'o1', name: 'Acme', meta: { versionId: '1' } };
  state.updateSpy.mockResolvedValue({});
  state.delSpy.mockResolvedValue(undefined);
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(cleanup);

function renderDrawer(onClose = vi.fn()) {
  render(<ResourceDrawer def={org} resourceId="o1" open onClose={onClose} />);
  return onClose;
}

describe('ResourceDrawer', () => {
  it('shows the resource JSON, title, and id in view mode', () => {
    renderDrawer();
    // "Acme"/"o1" appear in the header and the a11y dialog title / JSON — assert presence.
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/o1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/"resourceType": "Organization"/)).toBeInTheDocument();
  });

  it('copies JSON and raises a status toast', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'fhirViewerCopyCode' }));
    await waitFor(() =>
      expect(state.notifySpy).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success' })),
    );
  });

  it('hard-deletes after confirm: calls delete, writes a delete AuditEvent, closes', async () => {
    const onClose = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /fhirViewerDelete /i }));
    fireEvent.click(screen.getByRole('button', { name: 'fhirViewerDeleteConfirm' }));

    await waitFor(() => expect(state.delSpy).toHaveBeenCalledWith('o1'));
    expect(state.auditSpy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'delete', resourceType: 'Organization', resourceId: 'o1' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('enters edit mode and saves a modified resource, writing an update AuditEvent', async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /fhirViewerEdit /i }));

    const textarea = screen.getByLabelText('fhirViewerJsonLabel');
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ resourceType: 'Organization', id: 'o1', name: 'Beta' }) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'fhirViewerSave' }));

    await waitFor(() =>
      expect(state.updateSpy).toHaveBeenCalledWith({
        id: 'o1',
        body: { resourceType: 'Organization', id: 'o1', name: 'Beta' },
      }),
    );
    expect(state.auditSpy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'update', resourceType: 'Organization', resourceId: 'o1' }),
    );
  });

  it('disables Save until the JSON is edited', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /fhirViewerEdit /i }));
    expect(screen.getByRole('button', { name: 'fhirViewerSave' })).toBeDisabled();
  });
});
