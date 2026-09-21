import type { Practitioner } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testPlatformConfig } from '../test/testPlatformConfig';
import { ExtensionsContext } from './extensionsContext';
import { Slot } from './Slot';
import type { ExtensionContributions, SlotContexts } from './types';

type RowContext = { context: SlotContexts['users.rowActions'] };

const practitioner: Practitioner = { resourceType: 'Practitioner', id: 'p1' };

function OpenSchedules({ context }: RowContext): React.ReactElement {
  return <p>Schedules for {context.practitioner.id}</p>;
}

function OpenTraining({ context }: RowContext): React.ReactElement {
  return <p>Training for {context.practitioner.id}</p>;
}

function Broken(): React.ReactElement {
  throw new Error('slot exploded');
}

const contributions: ExtensionContributions = {
  nav: [],
  routes: [],
  widgets: [],
  questionnaires: {},
  slots: [
    { id: 'training.open', slot: 'users.rowActions', order: 30, component: OpenTraining },
    { id: 'broken.open', slot: 'users.rowActions', order: 20, component: Broken },
    { id: 'schedules.open', slot: 'users.rowActions', order: 10, component: OpenSchedules },
  ],
};

function renderScreen() {
  return render(
    <CorePlatformProvider config={testPlatformConfig}>
      <ExtensionsContext.Provider value={contributions}>
        <div data-testid="row-actions">
          <p>Built-in action</p>
          <Slot name="users.rowActions" context={{ practitioner }} />
        </div>
        <p>Rest of the screen</p>
      </ExtensionsContext.Provider>
    </CorePlatformProvider>,
  );
}

describe('Slot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the contributions for its name in order, each given the slot context', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderScreen();

    const texts = Array.from(screen.getByTestId('row-actions').children).map(
      (el) => el.textContent,
    );
    expect(texts[0]).toBe('Built-in action');
    expect(texts[1]).toBe('Schedules for p1');
    expect(texts[3]).toBe('Training for p1');
  });

  it('keeps the screen around a contribution that throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('Built-in action')).toBeInTheDocument();
    expect(screen.getByText('Schedules for p1')).toBeInTheDocument();
    expect(screen.getByText('Training for p1')).toBeInTheDocument();
    expect(screen.getByText('Rest of the screen')).toBeInTheDocument();
  });

  it('renders nothing when no extension contributes to the slot', () => {
    render(
      <CorePlatformProvider config={testPlatformConfig}>
        <div data-testid="row-actions">
          <Slot name="users.rowActions" context={{ practitioner }} />
        </div>
      </CorePlatformProvider>,
    );

    expect(screen.getByTestId('row-actions')).toBeEmptyDOMElement();
  });
});
