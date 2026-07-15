import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader } from './components/ui';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { CallbackPage } from './pages/CallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './features/users/UsersPage';
import { LocationsPage } from './features/locations/LocationsPage';
import { LocationsNoAccess } from './features/locations/LocationsNoAccess';
import { OrganizationsPage } from './features/organizations/OrganizationsPage';
import { CareTeamsPage } from './features/careteams/CareTeamsPage';
import { SetupWizardPage } from './features/setup-wizard/SetupWizardPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

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
          path="/locations"
          element={
            <ProtectedRoute
              flag="locationMgmt"
              permission="location-hierarchy.view"
              permissionFallback={<LocationsNoAccess status={403} />}
            >
              <LocationsPage />
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
        <Route
          path="/setup"
          element={
            <ProtectedRoute flag="setupWizard" permission="setup.view">
              <SetupWizardPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
