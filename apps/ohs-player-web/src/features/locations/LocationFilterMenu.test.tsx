import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { LocationFilterMenu } = await import('./LocationFilterMenu');

// The status-select behaviour (filterTree) is covered in expand.test.ts; Radix's portal menu doesn't open
// under jsdom's synthetic clicks, so here we cover the trigger's rendered/active state only.
describe('LocationFilterMenu', () => {
  it('renders the Filter trigger with aria-expanded closed by default', () => {
    render(<LocationFilterMenu value="all" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /locationsFilterButton/ });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the trigger active when a non-all status is selected', () => {
    const { rerender } = render(<LocationFilterMenu value="all" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /locationsFilterButton/ });
    expect(trigger.className).not.toMatch(/border-primary/);
    rerender(<LocationFilterMenu value="active" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /locationsFilterButton/ }).className).toMatch(/border-primary/);
  });
});
