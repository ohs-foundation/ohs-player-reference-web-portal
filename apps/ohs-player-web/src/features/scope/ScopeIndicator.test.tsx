import { fireEvent, render, screen } from '@testing-library/react';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { createPortalHost, ExtensionsContext, Slot } from 'ohs-player-web-shell';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { platformConfig, portalDefaults } from '../../config/platform';
import { extensions } from '../../extensions';
import { ScopeIndicator } from './ScopeIndicator';
import { AdminScopeContext, UNSCOPED, type AdminScope } from './useAdminScope';

const kisumu = { id: 'd1', name: 'Kisumu' };
const nakuru = { id: 'd2', name: 'Nakuru' };

function scope(fields: Partial<AdminScope> = {}): AdminScope {
  return { ...UNSCOPED, ...fields };
}

function renderIndicator(value: AdminScope) {
  return render(
    <CorePlatformProvider config={platformConfig}>
      <AdminScopeContext.Provider value={value}>
        <div data-testid="topbar">
          <ScopeIndicator />
        </div>
      </AdminScopeContext.Provider>
    </CorePlatformProvider>,
  );
}

describe('ScopeIndicator', () => {
  it('renders nothing for an unscoped user', () => {
    renderIndicator(UNSCOPED);

    expect(screen.getByTestId('topbar')).toBeEmptyDOMElement();
  });

  it('shows the one district and tells screen readers the list is only a convenience filter', async () => {
    const { container } = renderIndicator(
      scope({ status: 'scoped', districts: [kisumu], current: kisumu }),
    );

    expect(screen.getByTestId('topbar')).toHaveTextContent('Your districtKisumu');
    expect(screen.getByText(/This is a convenience filter/)).toHaveClass('ohs-visually-hidden');
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });

  it('keeps the district in place while its tree loads', () => {
    renderIndicator(scope({ status: 'loading', districts: [kisumu], current: kisumu }));

    expect(screen.getByText('Kisumu')).toBeInTheDocument();
  });

  it('lets a user with two districts switch with the keyboard alone', async () => {
    const setCurrent = vi.fn();
    const { container } = renderIndicator(
      scope({ status: 'scoped', districts: [kisumu, nakuru], current: kisumu, setCurrent }),
    );
    const picker = screen.getByRole('combobox', { name: /Your district/ });
    expect(picker).toHaveTextContent('Kisumu');

    fireEvent.keyDown(picker, { key: 'ArrowDown' });
    fireEvent.keyDown(picker, { key: 'ArrowDown' });
    fireEvent.keyDown(picker, { key: 'Enter' });

    expect(setCurrent).toHaveBeenCalledWith('d2');
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });

  it('says when the district could not be loaded and every record is shown', () => {
    renderIndicator(scope({ loadFailed: true }));

    expect(screen.getByText('District not loaded, showing every record')).toBeInTheDocument();
  });
});

describe('the scope extension in the host', () => {
  function renderTopbar(value: AdminScope) {
    const host = createPortalHost({ defaults: portalDefaults, extensions, development: true });
    return render(
      <CorePlatformProvider config={host.portal.platform}>
        <ExtensionsContext.Provider value={host.contributions}>
          <AdminScopeContext.Provider value={value}>
            <div data-testid="topbar">
              <Slot name="topbar.actions" context={{}} />
            </div>
          </AdminScopeContext.Provider>
        </ExtensionsContext.Provider>
      </CorePlatformProvider>,
    );
  }

  it('puts the indicator in the app bar for a scoped user', () => {
    renderTopbar(scope({ status: 'scoped', districts: [kisumu], current: kisumu }));

    expect(screen.getByTestId('topbar')).toHaveTextContent('Kisumu');
  });

  it('leaves the app bar as it was for an unscoped user', () => {
    renderTopbar(UNSCOPED);

    expect(screen.getByTestId('topbar')).toBeEmptyDOMElement();
  });
});
