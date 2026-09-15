import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { FilterChip, FilterChipBar } = await import('./Chips');

const OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function renderChip(props: Partial<React.ComponentProps<typeof FilterChip>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <FilterChip
      label="Status"
      allLabel="All statuses"
      options={OPTIONS}
      value={null}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...utils };
}

afterEach(cleanup);

describe('FilterChip (menu variant)', () => {
  it('renders the dimension name with a closed listbox popup', () => {
    renderChip();
    const chip = screen.getByRole('combobox', { name: 'Status' });
    expect(chip).toHaveAttribute('aria-haspopup', 'listbox');
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens on click with the reset item first, and selects a value', () => {
    const { onChange } = renderChip();
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));

    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['All statuses', 'Active', 'Inactive']);

    fireEvent.click(screen.getByRole('option', { name: 'Active' }));
    expect(onChange).toHaveBeenCalledWith('active');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows the value with a leading check when selected, and resets via the All item', () => {
    const { onChange } = renderChip({ value: 'inactive' });
    const chip = screen.getByRole('combobox', { name: 'Status: Inactive' });
    expect(chip).toHaveAttribute('data-selected', 'true');
    expect(chip).toHaveTextContent('Inactive');

    fireEvent.click(chip);
    expect(screen.getByRole('option', { name: 'Inactive' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('option', { name: 'All statuses' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('supports full keyboard operation: open, arrows, Home/End, typeahead, Enter, Escape', () => {
    const { onChange } = renderChip();
    const chip = screen.getByRole('combobox', { name: 'Status' });
    chip.focus();

    fireEvent.keyDown(chip, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);

    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    expect(chip).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    fireEvent.keyDown(chip, { key: 'End' });
    expect(chip).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[2].id);
    fireEvent.keyDown(chip, { key: 'Home' });
    expect(chip).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
    fireEvent.keyDown(chip, { key: 'i' });
    expect(chip).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[2].id);

    fireEvent.keyDown(chip, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('inactive');
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.keyDown(chip, { key: 'Enter' });
    fireEvent.keyDown(chip, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(chip);
  });

  it('closes on an outside pointer press', () => {
    renderChip();
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not open while disabled', () => {
    renderChip({ disabled: true });
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('has no serious a11y violations with the menu open', async () => {
    renderChip();
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    const result = await axe(document.body, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
    ).toEqual([]);
  });
});

describe('FilterChip (text variant)', () => {
  it('opens a dialog, applies the trimmed entry, and shows it as the selected label', () => {
    const onChange = vi.fn();
    render(
      <FilterChip variant="text" label="Status" hint="hint" value={null} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    const dialog = screen.getByRole('dialog', { name: 'Status' });
    expect(dialog).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  completed ' } });
    fireEvent.click(screen.getByRole('button', { name: 'filterApply' }));
    expect(onChange).toHaveBeenCalledWith('completed');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clears back to unselected and closes on Escape', () => {
    const onChange = vi.fn();
    render(<FilterChip variant="text" label="Status" value="active" onChange={onChange} />);

    const chip = screen.getByRole('button', { name: 'Status: active' });
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(onChange).toHaveBeenCalledWith(null);

    fireEvent.click(chip);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(chip);
  });
});

describe('FilterChipBar', () => {
  it('is a labelled group that shows Clear all only while a chip is selected', () => {
    const onClearAll = vi.fn();
    const { rerender } = render(
      <FilterChipBar onClearAll={onClearAll} clearVisible={false}>
        <FilterChip
          label="Status"
          allLabel="All statuses"
          options={OPTIONS}
          value={null}
          onChange={vi.fn()}
        />
      </FilterChipBar>,
    );
    expect(screen.getByRole('group', { name: 'filtersGroupLabel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'filterClearAll' })).toBeNull();

    rerender(
      <FilterChipBar onClearAll={onClearAll} clearVisible>
        <FilterChip
          label="Status"
          allLabel="All statuses"
          options={OPTIONS}
          value="active"
          onChange={vi.fn()}
        />
      </FilterChipBar>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'filterClearAll' }));
    expect(onClearAll).toHaveBeenCalled();
  });
});
