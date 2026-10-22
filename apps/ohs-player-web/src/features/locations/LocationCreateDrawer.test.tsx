import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminScopeContext, UNSCOPED, type AdminScope } from '../scope/useAdminScope';

const mockCommit = vi.fn();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      dir: 'ltr',
      locale: 'en',
    }),
    useFhirClient: () => ({}),
    useStatusBar: () => ({ notify: vi.fn() }),
    commitBundle: (...args: unknown[]) => mockCommit(...args) as unknown,
    committedId: () => 'new-location',
  };
});

vi.mock('./useLocationRoots', () => ({
  useAllLocationsLean: () => ({
    data: [
      { resourceType: 'Location', id: 'd1', name: 'Kisumu', status: 'active' },
      { resourceType: 'Location', id: 'f1', name: 'Kisumu Clinic', status: 'active' },
      { resourceType: 'Location', id: 'd2', name: 'Nakuru', status: 'active' },
    ],
  }),
}));

vi.mock('../audit/useWriteAudit', () => ({ useWriteAudit: () => vi.fn() }));

const { LocationCreateDrawer } = await import('./LocationCreateDrawer');

const kisumu = { id: 'd1', name: 'Kisumu' };
const inKisumu: AdminScope = {
  ...UNSCOPED,
  status: 'scoped',
  districts: [kisumu],
  current: kisumu,
  locationIds: new Set(['d1', 'f1']),
};

function drawer(scope: AdminScope) {
  return (
    <AdminScopeContext.Provider value={scope}>
      <LocationCreateDrawer onClose={vi.fn()} onSuccess={vi.fn()} />
    </AdminScopeContext.Provider>
  );
}

function parentField(): HTMLInputElement {
  return screen.getByRole('combobox', { name: 'locationsParentLocation' });
}

function parentOptions(): (string | null)[] {
  fireEvent.focus(parentField());
  const options = screen.getAllByRole('option').map((o) => o.textContent);
  fireEvent.blur(parentField());
  return options;
}

async function createNamed(name: string): Promise<Record<string, unknown>> {
  fireEvent.change(screen.getByRole('textbox', { name: /locationName/ }), {
    target: { value: name },
  });
  fireEvent.submit(document.getElementById('location-create-form') as HTMLFormElement);
  await waitFor(() => expect(mockCommit).toHaveBeenCalled());
  const entries = mockCommit.mock.calls.at(-1)?.[1] as { resource: Record<string, unknown> }[];
  return entries[0].resource;
}

beforeEach(() => {
  mockCommit.mockReset().mockResolvedValue({});
});

describe('LocationCreateDrawer parent', () => {
  it('starts at the root and offers every location to an unscoped user', () => {
    render(drawer(UNSCOPED));

    expect(parentField().value).toBe('rootLocation');
    expect(parentOptions()).toEqual(['rootLocation', 'Kisumu', 'Kisumu Clinic', 'Nakuru']);
  });

  it('defaults to the district and offers only locations inside it to a scoped user', () => {
    render(drawer(inKisumu));

    expect(parentField().value).toBe('Kisumu');
    expect(parentOptions()).toEqual(['Kisumu', 'Kisumu Clinic']);
  });

  it('falls back to the district, not a new root, when a scoped user clears the parent', async () => {
    render(drawer(inKisumu));

    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    fireEvent.keyDown(parentField(), { key: 'Escape' });

    expect(parentField().value).toBe('Kisumu');
    expect((await createNamed('New clinic')).partOf).toEqual({ reference: 'Location/d1' });
  });

  it('is scoped as soon as the district is known, while its tree still loads', () => {
    render(drawer({ ...inKisumu, status: 'loading', locationIds: new Set(['d1']) }));

    expect(parentField().value).toBe('Kisumu');
    expect(parentOptions()).toEqual(['Kisumu']);
  });

  it('picks up the district when the drawer opened before the lookup finished', async () => {
    const { rerender } = render(drawer({ ...UNSCOPED, status: 'loading' }));
    rerender(drawer(inKisumu));

    expect(parentField().value).toBe('Kisumu');
    expect((await createNamed('New clinic')).partOf).toEqual({ reference: 'Location/d1' });
  });
});
