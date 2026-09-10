import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FhirError } from 'ohs-player-web-core';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockWriteAuditEvent = vi.fn();
const mockNavigate = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockCustomGet = vi.fn();
const mockCreateResource = vi.fn();
// Stable client reference (the real useFhirClient is useMemo'd) so effects with a [client] dep run once.
const mockFhirClient = { transaction: mockTransaction, baseUrl: '', customGet: mockCustomGet };

const searchBundles: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  Organization: { entry: [{ resource: { resourceType: 'Organization', id: 'o1', name: 'Org One' } }] },
  Location: { entry: [{ resource: { resourceType: 'Location', id: 'l1', name: 'Loc One' } }] },
  CareTeam: {
    entry: [
      { resource: { resourceType: 'CareTeam', id: 'ct1', name: 'Team A' } },
      { resource: { resourceType: 'CareTeam', id: 'ct2', name: 'Team B' } },
    ],
  },
};

// `CareTeam?participant=` is the membership read; a bare `CareTeam` search feeds the picker.
const careTeamMemberships: { entry: { resource: Record<string, unknown> }[] } = { entry: [] };

const practitionerDetails: { data?: unknown; isLoading: boolean; error?: unknown } = {
  data: undefined,
  isLoading: false,
  error: undefined,
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
    writeAuditEvent: (...args: unknown[]) => mockWriteAuditEvent(...args) as unknown,
    useCustomEndpoint: () => ({
      post: { mutateAsync: mockPost, isPending: false },
      get: { mutateAsync: vi.fn() },
      put: { mutateAsync: mockPut, isPending: false },
    }),
    useCreateResource: () => ({ mutateAsync: mockCreateResource, isPending: false }),
    useCustomResource: () => practitionerDetails,
    useResource: (_resourceType: string | undefined, resourceId?: string) => ({
      data: resourceId ? mockPractitioner : undefined,
      isLoading: false,
      error: null,
    }),
    useSearch: (resourceType: string | undefined, params?: Record<string, string>) => ({
      data:
        resourceType === 'CareTeam' && params?.participant
          ? careTeamMemberships
          : resourceType
            ? (searchBundles[resourceType] ?? { entry: [] })
            : undefined,
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

function setPractitionerDetails(next: Partial<typeof practitionerDetails>): void {
  Object.assign(practitionerDetails, { data: undefined, isLoading: false, error: undefined }, next);
}

const roleDetail = {
  practitionerRole: {
    resourceType: 'PractitionerRole',
    id: 'pr1',
    code: [{ coding: [{ system: 'http://ohs.dev/roles', code: 'nurse', display: 'Nurse' }] }],
    organization: { reference: 'Organization/o1' },
    location: [{ reference: 'Location/l1' }],
  },
  organization: { resourceType: 'Organization', id: 'o1', name: 'Org One' },
  locations: [{ resourceType: 'Location', id: 'l1', name: 'Loc One' }],
  careTeams: [{ resourceType: 'CareTeam', id: 'ct1', name: 'Team A' }],
};

describe('UserEditDrawer', () => {
  beforeEach(() => {
    mockTransaction.mockReset().mockResolvedValue({});
    mockPut.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
    careTeamMemberships.entry = [];
    setPractitionerDetails({ data: { practitioner: mockPractitioner, practitionerRoles: [] } });
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
  it('pre-selects the role, organisation, location and care teams from the endpoint', async () => {
    setPractitionerDetails({
      data: { practitioner: mockPractitioner, practitionerRoles: [roleDetail] },
    });

    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByLabelText('columnRole')).toHaveValue('nurse');
    expect(screen.getByText('Org One')).toBeInTheDocument();
    expect(screen.getByText('Loc One')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
  });

  it('adds a care team picked from the list to the transaction bundle', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Jane');
    fireEvent.change(screen.getByLabelText('sectionCareTeams'), { target: { value: 'ct2' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));
    const bundle = mockTransaction.mock.calls[0][0] as {
      entry: { resource: Record<string, unknown>; request: { method: string; url: string } }[];
    };
    const added = bundle.entry.find((e) => e.request.url === 'CareTeam/ct2');
    expect(added?.request.method).toBe('PUT');
    expect(added?.resource.participant).toEqual([{ member: { reference: 'Practitioner/p1' } }]);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows a spinner while the practitioner context loads', () => {
    setPractitionerDetails({ isLoading: true });

    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByLabelText('columnRole')).not.toBeInTheDocument();
  });

  it('shows an error state when the practitioner context fails to load', () => {
    setPractitionerDetails({
      error: new FhirError('HTTP 403', 403, { error: 'Missing practitioner-details.view' }),
    });

    render(
      <MemoryRouter>
        <UserEditDrawer id="p1" onClose={vi.fn()} onSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Missing practitioner-details.view');
    expect(screen.queryByLabelText('columnRole')).not.toBeInTheDocument();
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
