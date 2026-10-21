import { render, screen } from '@testing-library/react';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { platformConfig } from '../../config/platform';
import { ScopeNote } from './ScopeNote';
import { AdminScopeContext, UNSCOPED, type AdminScope } from './useAdminScope';

const kisumu = { id: 'd1', name: 'Kisumu' };

function renderNote(scope: AdminScope) {
  return render(
    <CorePlatformProvider config={platformConfig}>
      <AdminScopeContext.Provider value={scope}>
        <div data-testid="note">
          <ScopeNote />
        </div>
      </AdminScopeContext.Provider>
    </CorePlatformProvider>,
  );
}

describe('ScopeNote', () => {
  it('says nothing to an unscoped user', () => {
    renderNote(UNSCOPED);

    expect(screen.getByTestId('note')).toBeEmptyDOMElement();
  });

  it('names the district and says the filter is only a convenience', () => {
    renderNote({ ...UNSCOPED, status: 'scoped', districts: [kisumu], current: kisumu });

    expect(screen.getByTestId('note')).toHaveTextContent(
      'Lists show records in Kisumu only. This is a convenience filter.',
    );
    expect(screen.getByTestId('note')).not.toHaveTextContent('was not loaded');
  });

  it('warns that records may be missing when the district was not loaded in full', () => {
    renderNote({
      ...UNSCOPED,
      status: 'scoped',
      districts: [kisumu],
      current: kisumu,
      incomplete: true,
    });

    expect(screen.getByTestId('note')).toHaveTextContent(
      'Part of this district was not loaded, so some of its records may be missing.',
    );
  });
});
