import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
    PermissionGuard: ({ children }: { children?: unknown }) => children,
  };
});

const { LocationRowMenu } = await import('./LocationRowMenu');

describe('LocationRowMenu', () => {
  it('renders the kebab trigger', () => {
    render(<LocationRowMenu nodeId="ke" onView={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /rowActions/ })).toBeInTheDocument();
  });

  // Deactivate was removed (gateway hierarchy cache can't reflect the write) — guard against regression.
  it('offers no deactivate action', () => {
    render(<LocationRowMenu nodeId="ke" onView={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.queryByText(/[Dd]eactivate/)).not.toBeInTheDocument();
  });
});
