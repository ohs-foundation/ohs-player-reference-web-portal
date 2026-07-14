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
const mockNotify = vi.fn();
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
    useStatusBar: () => ({ notify: mockNotify }),
    useRefreshResources: () => vi.fn().mockResolvedValue(undefined),
    useOptimisticInsert: () => () => () => undefined,
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
const { UserCreateEntryDrawer } = await import('./UserCreateEntryDrawer');
const { UserCreateWizard } = await import('./UserCreateWizard');
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
    mockNotify.mockReset();
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

  it('treats the user as created when only the role/CareTeam follow-up fails (still closes + warns)', async () => {
    // The gateway create (post) succeeds; the FHIR follow-up transaction rejects (e.g. staging 401/301).
    mockTransaction.mockReset().mockRejectedValue(new Error('transaction failed'));
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserCreateDrawer onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fillDemographics();
    fireEvent.change(screen.getByLabelText(/contextOrganization/), { target: { value: 'Organization/o1' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    // The follow-up failure must NOT block create success: drawer closes + list refreshes via onSuccess.
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    // ...but the user is warned the assignment didn't land, not told the whole create failed.
    expect(mockNotify).toHaveBeenCalledWith({ tone: 'warning', title: 'userCreatedAssignmentFailed' });
    // The audit still records the create.
    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
  });
});

describe('UserCreateEntryDrawer', () => {
  beforeEach(() => {
    mockPost.mockReset().mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'new',
      identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-123' }],
    });
    mockTransaction.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
    mockNotify.mockReset();
  });

  it('shows the mode chooser when opened', () => {
    render(
      <MemoryRouter>
        <UserCreateEntryDrawer onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('addUserModeSubtitle')).toBeInTheDocument();
    expect(screen.getByText('addUserQuickTitle')).toBeInTheDocument();
    expect(screen.getByText('addUserWizardTitle')).toBeInTheDocument();
  });

  it('opens quick add from the chooser and can create a user', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserCreateEntryDrawer onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /addUserQuickTitle/i }));
    fireEvent.change(screen.getByLabelText(/givenName/), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/familyName/), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/emailAddress/), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

describe('UserCreateWizard', () => {
  beforeEach(() => {
    mockPost.mockReset().mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'new',
      identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-123' }],
    });
    mockTransaction.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
    mockNotify.mockReset();
  });

  it('blocks advancing from basic info when required fields are missing', async () => {
    render(
      <MemoryRouter>
        <UserCreateWizard onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'next' }));

    expect(await screen.findByText('validationRequiredGiven')).toBeInTheDocument();
    expect(screen.getAllByText('wizardStepBasic').length).toBeGreaterThan(0);
  });

  it('walks through steps and creates a user from the review step', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserCreateWizard onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/givenName/), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/familyName/), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/emailAddress/), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    fireEvent.click(screen.getByRole('button', { name: 'next' }));

    expect(screen.getByText('wizardReviewIntro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'createUser' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

describe('UsersPage search', () => {
  beforeEach(() => mockUseSearch.mockClear());

  it('opens the add-user mode chooser from the header action', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'addUser' }));
    expect(screen.getByText('addUserModeSubtitle')).toBeInTheDocument();
  });

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
