import { render, screen } from '@testing-library/react';
import { CorePlatformProvider } from 'ohs-player-web-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorState } from '../components/ui';
import { testPlatformConfig } from '../test/testPlatformConfig';
import { ContributionBoundary } from './ContributionBoundary';

function Broken(): React.ReactElement {
  throw new Error('contribution exploded');
}

describe('ContributionBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the fallback in place of a contribution that throws, and reports the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();

    render(
      <CorePlatformProvider config={{ ...testPlatformConfig, onError }}>
        <p>Before</p>
        <ContributionBoundary fallback={<ErrorState />}>
          <Broken />
        </ContributionBoundary>
        <p>After</p>
      </CorePlatformProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'contribution exploded' }),
    );
  });

  it('renders the contribution when it does not throw', () => {
    render(
      <CorePlatformProvider config={testPlatformConfig}>
        <ContributionBoundary fallback={<ErrorState />}>
          <p>Working contribution</p>
        </ContributionBoundary>
      </CorePlatformProvider>,
    );

    expect(screen.getByText('Working contribution')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
