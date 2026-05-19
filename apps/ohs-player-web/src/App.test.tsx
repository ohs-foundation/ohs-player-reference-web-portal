import { render, screen } from '@testing-library/react';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { platformConfig } from './config/platform';
import { LoginPage } from './pages/LoginPage';

describe('LoginPage', () => {
  it('shows sign in', () => {
    render(
      <MemoryRouter>
        <CorePlatformProvider config={platformConfig}>
          <LoginPage />
        </CorePlatformProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/^Sign in$/i)).toBeInTheDocument();
  });
});
