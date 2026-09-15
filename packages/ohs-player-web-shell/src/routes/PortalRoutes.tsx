import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AppLayout } from '../layout/AppLayout';
import { RouteFallback } from './RouteFallback';
import type { PortalRoute } from './types';

const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LogoutPage = lazy(() => import('../pages/LogoutPage').then((m) => ({ default: m.LogoutPage })));
const CallbackPage = lazy(() =>
  import('../pages/CallbackPage').then((m) => ({ default: m.CallbackPage })),
);
const UnauthorizedPage = lazy(() =>
  import('../pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

const lazyPages = new WeakMap<PortalRoute['load'], LazyExoticComponent<ComponentType>>();

function lazyPage(load: PortalRoute['load']): LazyExoticComponent<ComponentType> {
  const cached = lazyPages.get(load);
  if (cached) return cached;
  const page = lazy(load);
  lazyPages.set(load, page);
  return page;
}

function GatedPage({ route }: Readonly<{ route: PortalRoute }>): React.ReactElement {
  const Page = lazyPage(route.load);
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

/** The shell's route table: sign-in pages, the dashboard, then `routes` under the portal frame. */
export function PortalRoutes({ routes, layoutChildren }: Readonly<PortalRoutesProps>): React.ReactElement {
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
