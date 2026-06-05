import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockWriteAuditEvent = vi.fn();
const mockNavigate = vi.fn();
const mockPost = vi.fn();
const mockCreateResource = vi.fn();

const searchBundles: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  Organization: { entry: [{ resource: { resourceType: 'Organization', id: 'o1', name: 'Org One' } }] },
  Location: { entry: [{ resource: { resourceType: 'Location', id: 'l1', name: 'Loc One' } }] },
};

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      dir: 'ltr',
      locale: 'en',
      formatDate: (v: unknown) => String(v),
      formatNumber: (v: unknown) => String(v),
    }),
    useFhirClient: () => ({ transaction: mockTransaction, baseUrl: '' }),
    writeAuditEvent: (...args: unknown[]) => mockWriteAuditEvent(...args) as unknown,
    useCustomEndpoint: () => ({
      post: { mutateAsync: mockPost, isPending: false },
      get: { mutateAsync: vi.fn() },
    }),
    useCreateResource: () => ({ mutateAsync: mockCreateResource, isPending: false }),
    useResource: () => ({ data: mockPractitioner, isLoading: false, error: null }),
    useSearch: (resourceType: string) => ({
      data: searchBundles[resourceType] ?? { entry: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

vi.mock('react-router-dom', async (): Promise<object> => {
  const actual = await vi.importActual<object>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../config/env', () => ({
  env: { questionnaireVariant: 'default' },
}));

const { UserCreateDrawer } = await import('./UserCreateDrawer');
const { UserEditDrawer } = await import('./UserEditDrawer');

const mockPractitioner = {
  resourceType: 'Practitioner',
  id: 'p1',
  active: true,
  name: [{ family: 'Smith', given: ['Jane'] }],
  telecom: [{ system: 'email', value: 'jane@example.com' }],
};

describe('UserEditDrawer', () => {
  beforeEach(() => {
    mockTransaction.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
  });

  it('pre-populates fields from the loaded practitioner', async () => {
    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );
    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('saves edits via a transaction PUT and writes an audit event', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    const familyInput = await screen.findByDisplayValue('Smith');
    fireEvent.change(familyInput, { target: { value: 'Jones' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));
    const bundle = mockTransaction.mock.calls[0][0] as {
      type?: string;
      entry?: { resource?: { name?: { family?: string }[] }; request?: { method?: string; url?: string } }[];
    };
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry?.[0].request).toEqual({ method: 'PUT', url: 'Practitioner/p1' });
    expect(bundle.entry?.[0].resource?.name?.[0].family).toBe('Jones');

    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

describe('UserCreateDrawer', () => {
  beforeEach(() => {
    mockPost.mockReset().mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'new',
      identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-123' }],
    });
    mockTransaction.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
  });

  function fillDemographics() {
    fireEvent.change(screen.getByLabelText('givenName'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('familyName'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('emailAddress'), { target: { value: 'jane@example.com' } });
  }

  it('blocks submit when required fields are missing', async () => {
    render(
      <MemoryRouter>
        <UserCreateDrawer onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(await screen.findByText('validationRequiredGiven')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('POSTs the backend payload then PUTs the enriched Practitioner', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserCreateDrawer onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fillDemographics();
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0][0]).toEqual({
      username: 'jane',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      enabled: true,
    });

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));
    const bundle = mockTransaction.mock.calls[0][0] as {
      entry?: { resource?: { telecom?: { system?: string; value?: string }[] }; request?: { method?: string; url?: string } }[];
    };
    expect(bundle.entry?.[0].request).toEqual({ method: 'PUT', url: 'Practitioner/new' });
    expect(bundle.entry?.[0].resource?.telecom?.[0]).toEqual({
      system: 'email',
      value: 'jane@example.com',
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
  });
});
