import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockWriteAuditEvent = vi.fn();
const mockRefresh = vi.fn();
const mockNotify = vi.fn();
const mockFhirClient = { transaction: mockTransaction, baseUrl: '' };

/**
 * `l99` appears only in the Organization bundle, as `_revinclude` returns it — never in the Location
 * search. That mirrors production, where the managed Location can fall outside the Location page.
 */
const searchBundles: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  Organization: {
    entry: [
      { resource: { resourceType: 'Organization', id: 'o1', name: 'Ministry of Health', active: true } },
      { resource: { resourceType: 'Organization', id: 'o2', name: 'Addis Ababa Health Bureau', active: true } },
      {
        resource: {
          resourceType: 'Location',
          id: 'l99',
          name: 'Addis Ababa',
          status: 'active',
          managingOrganization: { reference: 'Organization/o2' },
        },
      },
    ],
  },
  Location: {
    entry: [
      { resource: { resourceType: 'Location', id: 'l1', name: 'Clinic A', status: 'active' } },
      { resource: { resourceType: 'Location', id: 'l2', name: 'Clinic B', status: 'active' } },
    ],
  },
};

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key), dir: 'ltr', locale: 'en' }),
    useFhirClient: () => mockFhirClient,
    useAuth: () => ({ status: 'authenticated', user: { preferred_username: 'tester' } }),
    useRefreshResources: () => mockRefresh,
    useOptimisticInsert: () => () => () => undefined,
    useStatusBar: () => ({ notify: mockNotify }),
    writeAuditEvent: (...args: unknown[]) => mockWriteAuditEvent(...args) as unknown,
    useUpdateResource: () => ({ mutateAsync: vi.fn() }),
    PermissionGuard: ({ children }: { children: React.ReactNode }) => children,
    useSearch: (resourceType: string) => ({
      data: searchBundles[resourceType] ?? { entry: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const { OrganizationsPage } = await import('./OrganizationsPage');

const renderPage = () => render(<OrganizationsPage />, { wrapper: MemoryRouter });

beforeEach(() => {
  vi.clearAllMocks();
  // transaction returns the created Organization location for id extraction
  mockTransaction.mockResolvedValue({ entry: [{ response: { location: 'Organization/o9/_history/1' } }] });
});

describe('OrganizationsPage', () => {
  it('renders the org table and has no critical a11y violations', async () => {
    const { container } = renderPage();
    expect(await screen.findByText('Ministry of Health')).toBeInTheDocument();
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  it('create with a selected location issues one transaction: POST org (urn) + PATCH the location to it', async () => {
    renderPage();
    fireEvent.click(screen.getByText('addOrganization'));

    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getByLabelText(/organizationName/i), { target: { value: 'New Org' } });

    // Pick a location in the Managed Locations listbox: open the combobox, then choose the option.
    fireEvent.click(within(drawer).getByRole('combobox', { name: /contextLocation/ }));
    // The panel portals to <body> to escape the drawer's clipping, so query it from screen.
    fireEvent.click(screen.getByRole('option', { name: 'Clinic A' }));

    fireEvent.click(within(drawer).getByText('save'));

    await waitFor(() => expect(mockTransaction).toHaveBeenCalledTimes(1));
    const bundle = mockTransaction.mock.calls[0][0] as {
      entry: { fullUrl?: string; resource: Record<string, unknown>; request: { method: string; url: string } }[];
    };
    // entry 0 = POST Organization with a urn fullUrl
    expect(bundle.entry[0].request).toEqual({ method: 'POST', url: 'Organization' });
    expect(bundle.entry[0].fullUrl).toMatch(/^urn:uuid:/);
    // entry 1 = PATCH the picked Location, linking it to the urn org via delete+add
    const patch = bundle.entry[1];
    expect(patch.request).toEqual({ method: 'PATCH', url: 'Location/l1' });
    const ops = (patch.resource.parameter as { part: { name: string; valueCode?: string; valueReference?: { reference?: string } }[] }[]);
    expect(ops.map((o) => o.part.find((p) => p.name === 'type')?.valueCode)).toEqual(['delete', 'add']);
    const addValue = ops[1].part.find((p) => p.name === 'value')?.valueReference?.reference;
    expect(addValue).toBe(bundle.entry[0].fullUrl);
  });

  // Regression: the link lives on Location.managingOrganization, so deriving it from the Location
  // search only saw that search's first page — a link outside it rendered as "None on record".
  it('lists a managed location that the Location search never returned', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Addis Ababa Health Bureau'));

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('Addis Ababa')).toBeInTheDocument();
    expect(within(drawer).queryByText('detailNone')).toBeNull();
  });

  it('does not render a revincluded Location as an organisation row', async () => {
    renderPage();
    expect(await screen.findByText('Ministry of Health')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Addis Ababa' })).toBeNull();
  });
});
