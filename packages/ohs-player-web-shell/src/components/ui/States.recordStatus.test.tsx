import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => ({
  ...(await vi.importActual<object>('ohs-player-web-core')),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { RecordStatusBadge } = await import('./States');

describe('RecordStatusBadge', () => {
  it.each([
    ['active', 'statusActive', 'bg-positive-surface'],
    ['suspended', 'statusSuspended', 'text-warning'],
    ['inactive', 'statusInactive', 'bg-neutral-surface'],
  ])('renders %s with its label and tone', (status, label, toneClass) => {
    render(<RecordStatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveClass(toneClass);
  });

  it('renders an unknown code as itself in the neutral tone', () => {
    render(<RecordStatusBadge status="entered-in-error" />);
    expect(screen.getByText('entered-in-error')).toHaveClass('bg-neutral-surface');
  });

  it('keeps the tone when a caller passes its own label', () => {
    render(<RecordStatusBadge status="inactive">Closed</RecordStatusBadge>);
    expect(screen.getByText('Closed')).toHaveClass('bg-neutral-surface');
    expect(screen.queryByText('statusInactive')).not.toBeInTheDocument();
  });
});
