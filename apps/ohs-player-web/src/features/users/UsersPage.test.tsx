import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockWriteAuditEvent = vi.fn();
const mockNavigate = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockCustomGet = vi.fn();
const mockCreateResource = vi.fn();
const mockUseSearch = vi.fn();
// Stable client reference (the real useFhirClient is useMemo'd) so effects with a [client] dep run once.
const mockFhirClient = { transaction: mockTransaction, baseUrl: '', customGet: mockCustomGet };

const searchBundles: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  Practitioner: {
    entry: [{ resource: { resourceType: 'Practitioner', id: 'p1', active: true, name: [{ family: 'Smith', given: ['Jane'] }] } }],
  },
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
    useFhirClient: () => mockFhirClient,
    useAuth: () => ({ status: 'authenticated', user: { preferred_username: 'tester' } }),
    useStatusBar: () => ({ notify: vi.fn() }),
    PermissionGuard: ({ children }: { children: React.ReactNode }) => children,
    writeAuditEvent: (...args: unknown[]) => mockWriteAuditEvent(...args) as unknown,
    useCustomEndpoint: () => ({
      post: { mutateAsync: mockPost, isPending: false },
      get: { mutateAsync: vi.fn() },
      put: { mutateAsync: mockPut, isPending: false },
    }),
    useCreateResource: () => ({ mutateAsync: mockCreateResource, isPending: false }),
    useResource: () => ({ data: mockPractitioner, isLoading: false, error: null }),
    useSearch: (resourceType: string, params?: Record<string, string>) => {
      mockUseSearch(resourceType, params);
      return {
        data: searchBundles[resourceType] ?? { entry: [] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    },
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
const { UsersPage } = await import('./UsersPage');

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
    mockPut.mockReset().mockResolvedValue({});
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

  it('saves demographics via PUT /api/users/{id} (preserving username) and writes an audit event', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    const familyInput = await screen.findByDisplayValue('Smith');
    fireEvent.change(familyInput, { target: { value: 'Jones' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut.mock.calls[0][0]).toEqual({
      id: 'p1',
      body: {
        username: 'jane', // preserved from the loaded email, not re-derived
        firstName: 'Jane',
        lastName: 'Jones',
        email: 'jane@example.com',
        enabled: true,
      },
    });
    // No role/careteam change → no FHIR transaction.
    expect(mockTransaction).not.toHaveBeenCalled();

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
    mockCustomGet.mockReset().mockResolvedValue([]);
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
  });

  function fillDemographics() {
    fireEvent.change(screen.getByLabelText(/givenName/), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/familyName/), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/emailAddress/), { target: { value: 'jane@example.com' } });
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

  it('POSTs the full backend payload and skips the FHIR transaction when no assignment is chosen', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserCreateDrawer onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fillDemographics();
    fireEvent.change(screen.getByLabelText(/phoneNumber/), { target: { value: '0712345678' } });
    fireEvent.change(screen.getByLabelText(/dateOfBirth/), { target: { value: '1990-05-01' } });
    fireEvent.change(screen.getByLabelText(/nationalId/), { target: { value: 'NID-9' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    // The backend now owns the Practitioner — demographics go in the POST body.
    expect(mockPost.mock.calls[0][0]).toEqual({
      username: 'jane',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      enabled: true,
      phone: '0712345678',
      dob: '1990-05-01',
      national_id: 'NID-9',
    });

    // No role/org/careteam → nothing left for the client to write.
    expect(mockTransaction).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
  });

  it('writes only PractitionerRole(s) in the follow-up transaction (never a Practitioner PUT)', async () => {
    render(
      <MemoryRouter>
        <UserCreateDrawer onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    fillDemographics();
    fireEvent.change(screen.getByLabelText(/contextOrganization/), {
      target: { value: 'Organization/o1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));
    const bundle = mockTransaction.mock.calls[0][0] as {
      entry?: { resource?: { organization?: { reference?: string } }; request?: { method?: string; url?: string } }[];
    };
    const urls = (bundle.entry ?? []).map((e) => `${e.request?.method} ${e.request?.url}`);
    expect(urls).toContain('POST PractitionerRole');
    expect(urls.some((u) => u.startsWith('PUT Practitioner/'))).toBe(false);
    expect(bundle.entry?.[0].resource?.organization?.reference).toBe('Organization/o1');
  });
});

describe('UsersPage search', () => {
  beforeEach(() => mockUseSearch.mockClear());

  it('queries Practitioner with name:contains (server-side) when a term is typed', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );
    // initial load: Practitioner search with no name param
    const initial = mockUseSearch.mock.calls.find((c) => c[0] === 'Practitioner');
    expect(initial?.[1]).not.toHaveProperty('name:contains');

    fireEvent.change(screen.getByPlaceholderText('searchByNameOrId'), { target: { value: 'jane' } });

    // debounced (300ms) → eventually a Practitioner search carries name:contains
    await waitFor(() => {
      const withTerm = mockUseSearch.mock.calls.find(
        (c) => c[0] === 'Practitioner' && (c[1] as Record<string, string> | undefined)?.['name:contains'] === 'jane',
      );
      expect(withTerm).toBeDefined();
    });
  });
});
