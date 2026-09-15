import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AppLayout } from '../layout/AppLayout';
import { lazyComponent } from '../lib/lazyComponent';
import { RouteFallback } from './RouteFallback';
import type { PortalRoute } from './types';

const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LogoutPage = lazy(() =>
  import('../pages/LogoutPage').then((m) => ({ default: m.LogoutPage })),
);
const CallbackPage = lazy(() =>
  import('../pages/CallbackPage').then((m) => ({ default: m.CallbackPage })),
);
const UnauthorizedPage = lazy(() =>
  import('../pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

function GatedPage({ route }: Readonly<{ route: PortalRoute }>): React.ReactElement {
  const Page = lazyComponent(route.load);
  return (
    <ProtectedRoute
      flag={route.requires?.flag}
      permission={route.requires?.permission}
      permissionFallback={route.permissionFallback}
    >
      <Page />
    </ProtectedRoute>
  );
}

export interface PortalRoutesProps {
  routes: readonly PortalRoute[];
  layoutChildren?: ReactNode;
}

export function PortalRoutes({
  routes,
  layoutChildren,
}: Readonly<PortalRoutesProps>): React.ReactElement {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route element={<AppLayout>{layoutChildren}</AppLayout>}>
          <Route
            path="/"
            element={
              <ProtectedRoute flag="dashboard">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {routes.map((route) => (
            <Route key={route.id} path={route.path} element={<GatedPage route={route} />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
