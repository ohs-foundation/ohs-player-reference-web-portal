import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FhirError } from 'ohs-player-web-core';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockWriteAuditEvent = vi.fn();
const mockNotify = vi.fn();
const mockUseCustomResource = vi.fn();
const mockUseResource = vi.fn();
const mockUseSearch = vi.fn();
const mockFhirClient = { transaction: mockTransaction, baseUrl: '' };

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
    useStatusBar: () => ({ notify: mockNotify }),
    writeAuditEvent: (...args: unknown[]) => mockWriteAuditEvent(...args) as unknown,
    PermissionGuard: ({ children }: { children: ReactNode }) => children,
    useCustomResource: (...args: unknown[]) => mockUseCustomResource(...args) as unknown,
    useResource: (...args: unknown[]) => mockUseResource(...args) as unknown,
    useSearch: (...args: unknown[]) => mockUseSearch(...args) as unknown,
  };
});

const { NATIONAL_ID_IDENTIFIER_SYSTEM } = await import('../sdc/resourceFromAnswers');
const { UserDetailsDrawer } = await import('./UserDetailsDrawer');

const idle = { data: undefined, isLoading: false, error: undefined };

const practitioner = {
  resourceType: 'Practitioner',
  id: 'p1',
  active: true,
  name: [{ family: 'Smith', given: ['Jane'] }],
  telecom: [
    { system: 'email', value: 'jane@example.com' },
    { system: 'phone', value: '+254700000000' },
  ],
  gender: 'female',
  birthDate: '1990-01-01',
  identifier: [{ system: NATIONAL_ID_IDENTIFIER_SYSTEM, value: '12345678' }],
};

const careTeam = {
  resourceType: 'CareTeam',
  id: 'ct1',
  name: 'Team A',
  participant: [{ member: { reference: 'Practitioner/p1' } }],
};

const detailsResponse = {
  practitioner,
  practitionerRoles: [
    {
      practitionerRole: {
        resourceType: 'PractitionerRole',
        id: 'pr1',
        code: [{ coding: [{ code: 'nurse', display: 'Nurse' }] }],
        organization: { reference: 'Organization/o1' },
        location: [{ reference: 'Location/l1' }, { reference: 'Location/l2' }],
      },
      organization: { resourceType: 'Organization', id: 'o1', name: 'Org One' },
      locations: [
        { resourceType: 'Location', id: 'l1', name: 'Loc One' },
        { resourceType: 'Location', id: 'l2', name: 'Loc Two' },
      ],
      careTeams: [careTeam],
    },
  ],
};

function renderDrawer() {
  return render(
    <UserDetailsDrawer id="p1" onClose={vi.fn()} onEdit={vi.fn()} onDeleted={vi.fn()} />,
  );
}

describe('UserDetailsDrawer', () => {
  beforeEach(() => {
    mockTransaction.mockReset().mockResolvedValue({});
    mockWriteAuditEvent.mockReset().mockResolvedValue(undefined);
    mockNotify.mockReset();
    mockUseCustomResource.mockReset().mockReturnValue({ ...idle, data: detailsResponse });
    mockUseResource.mockReset().mockReturnValue(idle);
    mockUseSearch.mockReset().mockReturnValue(idle);
  });

  it('renders demographics, role, organisation, locations and care teams from one response', () => {
    renderDrawer();

    expect(screen.getAllByRole('heading', { name: 'Jane Smith' })).not.toHaveLength(0);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+254700000000')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
    expect(screen.getAllByText('Nurse')).not.toHaveLength(0);
    expect(screen.getByText('Org One')).toBeInTheDocument();
    expect(screen.getByText('Loc One')).toBeInTheDocument();
    expect(screen.getByText('Loc Two')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
  });

  it('issues one practitioner-context request instead of five FHIR reads', () => {
    renderDrawer();

    expect(mockUseCustomResource).toHaveBeenCalledWith(
      'practitionerDetails',
      { 'practitioner-id': 'p1' },
      { enabled: true },
    );
    // Every FHIR hook stays disabled: no Practitioner read, no Organization or Location list.
    for (const call of mockUseSearch.mock.calls) expect(call[0]).toBeUndefined();
    for (const call of mockUseResource.mock.calls) expect(call[1]).toBeUndefined();
  });

  it('shows a spinner while the request is in flight', () => {
    mockUseCustomResource.mockReturnValue({ ...idle, isLoading: true });

    renderDrawer();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('sectionBasicInfo')).not.toBeInTheDocument();
  });

  it('renders empty relationship sections for a practitioner with no roles', () => {
    mockUseCustomResource.mockReturnValue({
      ...idle,
      data: { practitioner, practitionerRoles: [] },
    });

    renderDrawer();

    expect(screen.getAllByRole('heading', { name: 'Jane Smith' })).not.toHaveLength(0);
    expect(screen.getAllByText('detailNone')).toHaveLength(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('surfaces a failed request as an error state and hides deactivate', () => {
    mockUseCustomResource.mockReturnValue({
      ...idle,
      error: new FhirError('HTTP 502', 502, {
        error: 'Failed to fetch practitioner details from FHIR server',
      }),
    });

    renderDrawer();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Failed to fetch practitioner details from FHIR server',
    );
    expect(screen.queryByRole('button', { name: 'deactivateUser' })).not.toBeInTheDocument();
  });

  it('deactivates from the endpoint response and writes an audit event', async () => {
    const onDeleted = vi.fn();
    render(
      <UserDetailsDrawer id="p1" onClose={vi.fn()} onEdit={vi.fn()} onDeleted={onDeleted} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'deactivateUser' }));
    fireEvent.click(screen.getByRole('button', { name: 'deactivate' }));

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));
    const bundle = mockTransaction.mock.calls[0][0] as {
      entry: { resource: Record<string, unknown>; request: { method: string; url: string } }[];
    };
    const byUrl = new Map(bundle.entry.map((e) => [e.request.url, e.resource]));

    expect(byUrl.get('Practitioner/p1')).toMatchObject({ active: false });
    expect(byUrl.get('CareTeam/ct1')).toMatchObject({ participant: [] });
    const endedRole = byUrl.get('PractitionerRole/pr1');
    expect(endedRole).toMatchObject({ active: false });
    expect(typeof (endedRole?.period as { end?: unknown } | undefined)?.end).toBe('string');

    await waitFor(() => expect(mockWriteAuditEvent).toHaveBeenCalledTimes(1));
    expect(mockWriteAuditEvent.mock.calls[0][1]).toMatchObject({
      action: 'update',
      resourceType: 'Practitioner',
      resourceId: 'p1',
    });
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('has no critical accessibility violations', async () => {
    const { baseElement } = renderDrawer();

    const result = await axe(baseElement, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
