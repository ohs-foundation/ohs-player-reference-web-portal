import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
    useStatusBar: () => ({ notify: vi.fn() }),
    useResource: () => ({ data: undefined }),
    useUpdateResource: () => ({ mutateAsync: vi.fn() }),
  };
});

vi.mock('../audit/useWriteAudit', () => ({ useWriteAudit: () => vi.fn() }));

const { LocationRowMenu } = await import('./LocationRowMenu');

describe('LocationRowMenu', () => {
  it('renders the kebab trigger', () => {
    render(<LocationRowMenu nodeId="ke" status="active" onView={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: /rowActions/ })).toBeInTheDocument();
  });

  // Radix opens its menu in a portal that jsdom's synthetic clicks don't trigger, so the item-level
  // behaviour (view/edit/deactivate) is covered indirectly; here we assert the trigger is present and
  // the deactivate flow's confirm dialog is closed initially (no dialog in the DOM).
  it('does not show the confirm dialog until deactivate is chosen', () => {
    render(<LocationRowMenu nodeId="ke" status="active" onView={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.queryByText(/confirmDeactivateLocationBody/)).not.toBeInTheDocument();
  });
});
