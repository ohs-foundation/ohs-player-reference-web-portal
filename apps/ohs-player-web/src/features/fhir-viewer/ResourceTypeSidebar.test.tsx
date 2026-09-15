import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { ResourceTypeSidebar } = await import('./ResourceTypeSidebar');

afterEach(cleanup);

describe('ResourceTypeSidebar', () => {
  it('lists all 34 resource types and marks the selected one', () => {
    render(<ResourceTypeSidebar selected="Organization" onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(34);
    expect(screen.getByRole('button', { name: 'fhirTypeOrganization' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('client-filters the list by label', () => {
    render(<ResourceTypeSidebar selected="Patient" onSelect={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'task' } });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('fhirTypeTask');
  });

  it('shows an empty message when nothing matches', () => {
    render(<ResourceTypeSidebar selected="Patient" onSelect={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz-nomatch' } });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('fhirViewerNoTypeMatches')).toBeInTheDocument();
  });

  it('calls onSelect with the resourceType when a type is clicked', () => {
    const onSelect = vi.fn();
    render(<ResourceTypeSidebar selected="Patient" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'fhirTypeCareTeam' }));
    expect(onSelect).toHaveBeenCalledWith('CareTeam');
  });
});
