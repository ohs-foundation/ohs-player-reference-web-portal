import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { KPI_CATALOGUE } = await import('./kpiCatalogue');
const { KpiPicker } = await import('./KpiPicker');

type KpiId = (typeof KPI_CATALOGUE)[number]['id'];

const onSave = vi.fn();

async function renderPicker(selected: KpiId[], max = 4): Promise<HTMLElement> {
  render(<KpiPicker options={KPI_CATALOGUE} selected={selected} max={max} onSave={onSave} />);
  return openPicker();
}

async function openPicker(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: 'kpiCustomize' }));
  return screen.findByRole('dialog');
}

const option = (panel: HTMLElement, name: string) => within(panel).getByRole('checkbox', { name });

describe('KpiPicker', () => {
  beforeEach(() => {
    onSave.mockReset();
  });

  it('opens from the split button and lists every option in catalogue order', async () => {
    const panel = await renderPicker(['users']);

    expect(screen.getByRole('button', { name: 'kpiCustomize' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(panel).getAllByRole('checkbox')).toHaveLength(4);
    expect(
      within(panel)
        .getAllByText(/^nav/)
        .map((label) => label.textContent),
    ).toEqual(['navUsers', 'navLocations', 'navOrganizations', 'navCareTeams']);
    expect(option(panel, 'navUsers')).toBeChecked();
    expect(option(panel, 'navLocations')).not.toBeChecked();
  });

  it('toggles an option when its row is clicked', async () => {
    const panel = await renderPicker([]);

    fireEvent.click(within(panel).getByText('navLocations'));

    expect(option(panel, 'navLocations')).toBeChecked();
  });

  it('saves the edited selection and closes', async () => {
    const panel = await renderPicker(['users']);

    fireEvent.click(option(panel, 'navUsers'));
    fireEvent.click(option(panel, 'navCareTeams'));
    fireEvent.click(within(panel).getByRole('button', { name: 'save' }));

    expect(onSave).toHaveBeenCalledWith(['careTeams']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('discards edits on Cancel', async () => {
    const panel = await renderPicker(['users']);

    fireEvent.click(option(panel, 'navUsers'));
    fireEvent.click(within(panel).getByRole('button', { name: 'cancel' }));
    const reopened = await openPicker();

    expect(onSave).not.toHaveBeenCalled();
    expect(option(reopened, 'navUsers')).toBeChecked();
  });

  it('discards edits when dismissed with Escape', async () => {
    const panel = await renderPicker(['users']);

    fireEvent.click(option(panel, 'navLocations'));
    fireEvent.keyDown(panel, { key: 'Escape' });
    const reopened = await openPicker();

    expect(onSave).not.toHaveBeenCalled();
    expect(option(reopened, 'navLocations')).not.toBeChecked();
  });

  it('shows the limit notice and disables unticked rows at the maximum', async () => {
    const panel = await renderPicker(['users'], 2);

    expect(within(panel).queryByText('kpiPickerLimit')).not.toBeInTheDocument();
    fireEvent.click(option(panel, 'navLocations'));

    expect(within(panel).getByRole('status')).toHaveTextContent('kpiPickerLimit');
    expect(option(panel, 'navOrganizations')).toBeDisabled();
    expect(option(panel, 'navUsers')).toBeEnabled();

    fireEvent.click(within(panel).getByText('navOrganizations'));
    expect(option(panel, 'navOrganizations')).not.toBeChecked();
  });

  it('shows the notice when all four are ticked', async () => {
    const panel = await renderPicker(['users', 'locations', 'organizations', 'careTeams']);

    expect(within(panel).getByRole('status')).toHaveTextContent('kpiPickerLimit');
  });

  it('only lists and saves the options it is given', async () => {
    render(
      <KpiPicker
        options={KPI_CATALOGUE.filter((kpi) => kpi.id !== 'careTeams')}
        selected={['users', 'careTeams']}
        max={4}
        onSave={onSave}
      />,
    );
    const panel = await openPicker();

    expect(within(panel).queryByText('navCareTeams')).not.toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'save' }));
    expect(onSave).toHaveBeenCalledWith(['users']);
  });

  it('has no critical a11y violations while open', async () => {
    const panel = await renderPicker(['users', 'locations', 'organizations', 'careTeams']);

    const result = await axe(panel, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
