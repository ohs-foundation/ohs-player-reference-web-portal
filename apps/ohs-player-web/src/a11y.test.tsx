import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { platformConfig } from './config/platform';
import { LoginPage } from './pages/LoginPage';

describe('a11y', () => {
  it('login page has no axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <CorePlatformProvider config={platformConfig}>
          <LoginPage />
        </CorePlatformProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/^Sign in$/i)).toBeInTheDocument();
    const result = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
