import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockWriteAuditEvent = vi.fn();
const mockRefresh = vi.fn();
const mockNotify = vi.fn();
const mockFhirClient = { transaction: mockTransaction, baseUrl: '' };

const searchBundles: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  Organization: {
    entry: [
      { resource: { resourceType: 'Organization', id: 'o1', name: 'Ministry of Health', active: true } },
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

    // pick a location in the Managed Locations multiselect (a combobox showing the option labels)
    const select = within(drawer).getAllByRole('combobox').find((el) =>
      within(el).queryByText('Clinic A'),
    );
    expect(select).toBeDefined();
    fireEvent.change(select as HTMLSelectElement, { target: { value: 'Location/l1' } });

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
});
