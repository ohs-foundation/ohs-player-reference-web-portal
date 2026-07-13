import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { LocationViewToggle } = await import('./LocationViewToggle');

describe('LocationViewToggle', () => {
  it('renders a radiogroup with the active view checked', () => {
    render(<LocationViewToggle value="tree" onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    const tree = screen.getByRole('radio', { name: /locationsViewTree/ });
    const column = screen.getByRole('radio', { name: /locationsViewColumn/ });
    expect(tree).toHaveAttribute('aria-checked', 'true');
    expect(column).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked view', () => {
    const onChange = vi.fn();
    render(<LocationViewToggle value="tree" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /locationsViewColumn/ }));
    expect(onChange).toHaveBeenCalledWith('column');
  });

  it('has no axe violations', async () => {
    const { container } = render(<LocationViewToggle value="column" onChange={vi.fn()} />);
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
