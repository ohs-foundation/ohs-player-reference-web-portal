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

const { Listbox } = await import('./Listbox');
const { Drawer } = await import('./Drawer');

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

function open(name = /Assignment/) {
  fireEvent.click(screen.getByRole('combobox', { name }));
}

describe('Listbox', () => {
  it('keeps the option list closed until the trigger is used', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    expect(screen.queryByRole('listbox')).toBeNull();
    open();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('reports expanded state and the active option to assistive tech', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    open();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0].id);
  });

  it('moves the active option with Arrow, Home and End', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    open();
    const ids = screen.getAllByRole('option').map((o) => o.id);

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger).toHaveAttribute('aria-activedescendant', ids[1]);
    fireEvent.keyDown(trigger, { key: 'End' });
    expect(trigger).toHaveAttribute('aria-activedescendant', ids[2]);
    fireEvent.keyDown(trigger, { key: 'Home' });
    expect(trigger).toHaveAttribute('aria-activedescendant', ids[0]);
  });

  it('selects with Enter and closes, single-select', () => {
    const onChange = vi.fn();
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={onChange}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    open();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['b']);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('toggles values and stays open when multiple', () => {
    const onChange = vi.fn();
    render(
      <Listbox
        label="Assignment"
        value={['a']}
        onChange={onChange}
        options={OPTIONS}
        placeholder="Pick"
        multiple
      />,
    );
    open();
    fireEvent.click(screen.getByRole('option', { name: 'Bravo' }));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('jumps to an option by type-ahead', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    open();
    fireEvent.keyDown(trigger, { key: 'c' });
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[2].id);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    open();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('opens on the first enabled option, never a disabled one', () => {
    const withDisabledFirst = [{ value: 'a', label: 'Alpha', disabled: true }, ...OPTIONS.slice(1)];
    const onChange = vi.fn();
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={onChange}
        options={withDisabledFirst}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    open();

    // Bravo, not the disabled Alpha — otherwise Enter would be a no-op, since commit skips disabled.
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('opens on the selected option rather than the one after it', () => {
    render(
      <Listbox
        label="Assignment"
        value={['b']}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Assignment/ });
    open();
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
  });

  it('renders an empty state rather than a bare panel', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={[]}
        placeholder="Pick one"
      />,
    );
    open();
    expect(screen.getByText('comboboxNoResults')).toBeInTheDocument();
  });

  /**
   * Regression: the field sits inside the section card's overflow:hidden, the drawer shell and the
   * scrolling drawer body. An in-flow panel was clipped to nothing — not one option was visible.
   */
  it('escapes clipping ancestors by rendering the panel outside them', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', height: 40 }}>
        <Listbox
          label="Assignment"
          value={[]}
          onChange={vi.fn()}
          options={OPTIONS}
          placeholder="Pick one"
        />
      </div>,
    );
    open();

    const panel = screen.getByRole('listbox');
    expect(container.contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  /**
   * Regression: inside the modal drawer (Radix Dialog) a body-portalled panel is pointer-transparent
   * — Radix disables pointer events outside its content — so clicking an option fell through to the
   * drawer and only closed the panel. The panel must portal into the drawer content instead.
   */
  it('portals the panel into the enclosing drawer so options stay selectable', () => {
    const onChange = vi.fn();
    render(
      <Drawer open onClose={vi.fn()} title="Edit user">
        <Listbox
          label="Assignment"
          value={[]}
          onChange={onChange}
          options={OPTIONS}
          placeholder="Pick one"
        />
      </Drawer>,
    );
    open();

    const panel = screen.getByRole('listbox');
    expect(panel.closest('.ohs-drawer')).not.toBeNull();

    fireEvent.click(screen.getByRole('option', { name: 'Bravo' }));
    expect(onChange).toHaveBeenCalledWith(['b']);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps click-outside working now that the panel is portalled', () => {
    render(
      <Listbox
        label="Assignment"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    open();
    // A click inside the portalled panel must not close it.
    fireEvent.mouseDown(screen.getByRole('listbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('has no serious or critical axe violations when open', async () => {
    const { container } = render(
      <Listbox
        label="Assignment"
        value={['a']}
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
        required
      />,
    );
    open();
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
    ).toEqual([]);
  });
});
