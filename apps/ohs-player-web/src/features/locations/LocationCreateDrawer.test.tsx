import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminScopeContext, UNSCOPED, type AdminScope } from '../scope/useAdminScope';

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

function renderWith(scope: AdminScope) {
  render(
    <AdminScopeContext.Provider value={scope}>
      <LocationCreateDrawer onClose={vi.fn()} onSuccess={vi.fn()} />
    </AdminScopeContext.Provider>,
  );
  const parent = screen.getByRole('combobox', { name: 'locationsParentLocation' });
  const shown = (parent as HTMLInputElement).value;
  fireEvent.focus(parent);
  return { shown, options: screen.getAllByRole('option').map((o) => o.textContent) };
}

describe('LocationCreateDrawer parent', () => {
  it('starts at the root and offers every location to an unscoped user', () => {
    const { shown, options } = renderWith(UNSCOPED);

    expect(shown).toBe('rootLocation');
    expect(options).toEqual(['rootLocation', 'Kisumu', 'Kisumu Clinic', 'Nakuru']);
  });

  it('defaults to the district and offers only locations inside it to a scoped user', () => {
    const { shown, options } = renderWith({
      ...UNSCOPED,
      status: 'scoped',
      districts: [kisumu],
      current: kisumu,
      locationIds: new Set(['d1', 'f1']),
    });

    expect(shown).toBe('Kisumu');
    expect(options).toEqual(['Kisumu', 'Kisumu Clinic']);
  });
});
