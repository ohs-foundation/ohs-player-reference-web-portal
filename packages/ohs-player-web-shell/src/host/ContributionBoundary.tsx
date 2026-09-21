import { useCoreConfig } from 'ohs-player-web-core';
import { Component, type ReactNode } from 'react';

interface BoundaryProps {
  fallback: ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ContributionBoundary({
  fallback,
  children,
}: Readonly<{ fallback: ReactNode; children: ReactNode }>): React.ReactElement {
  const { onError } = useCoreConfig();
  return (
    <Boundary fallback={fallback} onError={onError}>
      {children}
    </Boundary>
  );
}
