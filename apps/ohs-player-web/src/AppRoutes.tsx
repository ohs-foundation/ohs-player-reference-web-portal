import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { Page, PageHeader, useTranslation } from 'ohs-player-web-core';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { CallbackPage } from './pages/CallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { UserEditPage, UsersPage } from './features/users/UsersPage';
import { LocationEditPage, LocationsPage } from './features/locations/LocationsPage';
import { OrganizationsPage } from './features/organizations/OrganizationsPage';
import { CareTeamsPage } from './features/careteams/CareTeamsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

function LocationEditPermissionFallback() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader
        title={t('pageLocationEditForbiddenTitle')}
        description={t('pageLocationEditForbiddenDescription')}
      />
      <p>
        <Link to="/locations">{t('breadcrumbLocations')}</Link>
      </p>
    </Page>
  );
}

function OrganizationsPermissionFallback() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t('pageUnauthorized')} description={t('pageUnauthorizedDescription')} />
      <p>
        <Link to="/">{t('goToDashboard')}</Link>
      </p>
    </Page>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute flag="dashboard">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute flag="userMgmt" permission="users.view">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <ProtectedRoute flag="userMgmt" permission="users.edit">
              <UserEditWrap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/locations"
          element={
            <ProtectedRoute flag="locationMgmt" permission="locations.view">
              <LocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/locations/:id"
          element={
            <ProtectedRoute
              flag="locationMgmt"
              permission="locations.edit"
              permissionFallback={<LocationEditPermissionFallback />}
            >
              <LocationEditWrap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizations"
          element={
            <ProtectedRoute
              flag="orgMgmt"
              permission="orgs.view"
              permissionFallback={<OrganizationsPermissionFallback />}
            >
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/care-teams"
          element={
            <ProtectedRoute flag="careTeams" permission="careteams.view">
              <CareTeamsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function UserEditWrap() {
  const { id } = useParams();
  if (!id) return <Navigate to="/users" replace />;
  return <UserEditPage id={id} />;
}

function LocationEditWrap() {
  const { id } = useParams();
  if (!id) return <Navigate to="/locations" replace />;
  return <LocationEditPage id={id} />;
}
