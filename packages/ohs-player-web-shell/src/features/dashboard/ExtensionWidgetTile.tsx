import { FeatureGuard, PermissionGuard, type ExtensionWidget } from 'ohs-player-web-core';
import { Suspense, type ReactNode } from 'react';
import { Card, ErrorState, Spinner } from '../../components/ui';
import { ContributionBoundary } from '../../host/ContributionBoundary';
import type { DashboardRegion } from '../../host/types';
import { lazyComponent } from '../../lib/lazyComponent';

export function ExtensionWidgetTile({
  widget,
}: Readonly<{ widget: ExtensionWidget<DashboardRegion> }>): ReactNode {
  const Widget = lazyComponent(widget.load);
  const { flag, permission } = widget.requires ?? {};

  let tile: ReactNode = (
    <ContributionBoundary
      fallback={
        <Card>
          <ErrorState />
        </Card>
      }
    >
      <Suspense
        fallback={
          <Card>
            <Spinner />
          </Card>
        }
      >
        <Widget />
      </Suspense>
    </ContributionBoundary>
  );
  if (permission) {
    tile = (
      <PermissionGuard permission={permission} fallback={null}>
        {tile}
      </PermissionGuard>
    );
  }
  if (flag) tile = <FeatureGuard flag={flag}>{tile}</FeatureGuard>;
  return tile;
}
