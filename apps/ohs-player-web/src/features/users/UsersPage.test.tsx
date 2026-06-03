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

// Hermetic env: exercise the gateway path regardless of the developer's local .env flag.
vi.mock('../../config/env', () => ({
  env: { usersDirectFhir: false, questionnaireVariant: 'default' },
}));

const { UserCreateForm, UserEditForm } = await import('./UsersPage');

const userQuestionnaire = (await import('../../questionnaires/registry')).getBundledQuestionnaires().user;

const practitioner = {
  resourceType: 'Practitioner',
  id: 'p1',
  active: true,
  name: [{ family: 'Smith', given: ['Jane'] }],
  telecom: [{ system: 'email', value: 'jane@example.com' }],
};

describe('UserEditForm', () => {
  beforeEach(() => {
    mockTransaction.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
    mockNavigate.mockReset();
  });

  it('pre-populates fields from the practitioner', () => {
    render(
      <MemoryRouter>
        <UserEditForm id="p1" practitioner={practitioner} />
      </MemoryRouter>,
    );
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('saves via a one-entry transaction Bundle and writes an audit event', async () => {
    render(
      <MemoryRouter>
        <UserEditForm id="p1" practitioner={practitioner} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByDisplayValue('Smith'), { target: { value: 'Jones' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));

    const bundle = mockTransaction.mock.calls[0][0] as {
      type?: string;
      entry?: { resource?: { name?: { family?: string }[] }; request?: { method?: string; url?: string } }[];
    };
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry?.[0].request).toEqual({ method: 'PUT', url: 'Practitioner/p1' });
    expect(bundle.entry?.[0].resource?.name?.[0].family).toBe('Jones');

    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/users'));
  });
});

describe('UserCreateForm', () => {
  beforeEach(() => {
    mockPost.mockReset().mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'new',
      identifier: [{ value: 'kc-123' }],
    });
    mockCreateResource.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
  });

  function fillDemographics() {
    fireEvent.change(screen.getByLabelText('Given name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Family name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
  }

  it('blocks submit and shows an error when no role is selected', async () => {
    render(
      <MemoryRouter>
        <UserCreateForm questionnaire={userQuestionnaire} onSuccess={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>,
    );

    fillDemographics();
    fireEvent.click(screen.getByRole('button', { name: 'saveAndClose' }));

    expect(await screen.findByText('rolesRequired')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('blocks submit when required demographics are missing', () => {
    render(
      <MemoryRouter>
        <UserCreateForm questionnaire={userQuestionnaire} onSuccess={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('option', { name: 'Administrator' }));
    fireEvent.click(screen.getByRole('button', { name: 'saveAndClose' }));

    expect(screen.getByText('questionnaireRequiredFields')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('submits a payload with selected roles and demographics', async () => {
    const onSuccess = vi.fn();
    render(
      <MemoryRouter>
        <UserCreateForm questionnaire={userQuestionnaire} onSuccess={onSuccess} onCancel={vi.fn()} />
      </MemoryRouter>,
    );

    fillDemographics();
    fireEvent.click(screen.getByRole('option', { name: 'Administrator' }));
    fireEvent.click(screen.getByRole('button', { name: 'saveAndClose' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0][0]).toEqual({
      givenName: 'Jane',
      familyName: 'Smith',
      email: 'jane@example.com',
      roles: ['admin'],
      assignments: [],
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
  });
});
