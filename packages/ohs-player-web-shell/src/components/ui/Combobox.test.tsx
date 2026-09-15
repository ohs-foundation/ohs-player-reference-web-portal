import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) =>
        vars ? `${key} ${JSON.stringify(vars)}` : key,
      dir: 'ltr',
      locale: 'en',
    }),
  };
});

const { Combobox } = await import('./Combobox');
const { filterComboboxOptions } = await import('./comboboxFilter');

const OPTIONS = [
  { value: '__root__', label: '(root)' },
  { value: 'Location/et', label: 'Ethiopia' },
  { value: 'Location/ng', label: 'Nigeria' },
  { value: 'Location/tz', label: 'Tanzania' },
];

describe('filterComboboxOptions', () => {
  it('matches label substring case-insensitively', () => {
    expect(filterComboboxOptions(OPTIONS, 'tan').map((o) => o.value)).toEqual(['Location/tz']);
    expect(filterComboboxOptions(OPTIONS, '').length).toBe(4);
  });
});

describe('Combobox', () => {
  it('opens a listbox and filters options as the user types', () => {
    const onChange = vi.fn();
    render(
      <Combobox label="Parent" value="Location/ng" onChange={onChange} options={OPTIONS} />,
    );
    const input = screen.getByRole('combobox', { name: /Parent/ });
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'eth' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Ethiopia' })).toBeInTheDocument();
  });

  it('calls onChange when an option is chosen', () => {
    const onChange = vi.fn();
    render(
      <Combobox label="Parent" value="Location/ng" onChange={onChange} options={OPTIONS} />,
    );
    fireEvent.focus(screen.getByRole('combobox', { name: /Parent/ }));
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Tanzania' }));
    expect(onChange).toHaveBeenCalledWith('Location/tz');
  });

  it('caps rendered options and shows a narrow-hint when over maxVisible', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      value: `id-${i}`,
      label: `Place ${i}`,
    }));
    render(
      <Combobox label="Parent" value="" onChange={vi.fn()} options={many} maxVisible={50} />,
    );
    fireEvent.focus(screen.getByRole('combobox', { name: /Parent/ }));
    expect(screen.getAllByRole('option')).toHaveLength(50);
    expect(screen.getByText(/comboboxShowingLimited/)).toBeInTheDocument();
  });
});
