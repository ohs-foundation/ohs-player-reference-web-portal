import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mutateLocation = vi.fn().mockResolvedValue({});
const mutateQr = vi.fn().mockResolvedValue({});

const LOCATION_RESOURCE = {
  resourceType: 'Location',
  id: 'nrb',
  status: 'active',
  name: 'Nairobi County',
  mode: 'instance',
  partOf: { reference: 'Location/ke' },
};

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
    useStatusBar: () => ({ notify: vi.fn() }),
    useResource: () => ({ data: LOCATION_RESOURCE, isLoading: false }),
    useSearch: () => ({
      data: {
        resourceType: 'Bundle',
        entry: [
          { resource: { resourceType: 'Location', id: 'ke', name: 'Kenya' } },
          { resource: LOCATION_RESOURCE },
        ],
      },
    }),
    useUpdateResource: () => ({ mutateAsync: mutateLocation }),
    useCreateResource: () => ({ mutateAsync: mutateQr }),
  };
});

vi.mock('../audit/useWriteAudit', () => ({ useWriteAudit: () => vi.fn() }));

const { LocationEditDrawer } = await import('./LocationEditDrawer');

describe('LocationEditDrawer', () => {
  it('renders the SDC form prefilled from the FHIR resource, with a footer Save wired to the form', () => {
    render(<LocationEditDrawer nodeId="nrb" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByDisplayValue('Nairobi County')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toHaveAttribute('form', 'location-edit-form');
  });

  it('submits via the FHIR Location PUT (useUpdateResource) and reports back', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<LocationEditDrawer nodeId="nrb" onClose={onClose} onSaved={onSaved} />);
    fireEvent.submit(document.getElementById('location-edit-form') as HTMLFormElement);
    await waitFor(() =>
      expect(mutateLocation).toHaveBeenCalledWith({
        id: 'nrb',
        body: expect.objectContaining({ resourceType: 'Location', name: 'Nairobi County' }) as unknown,
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});
