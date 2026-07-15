import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useFlag, usePermission, useSearch } from 'ohs-player-web-core';
import {
  isInstanceMissingSetupData,
  isSetupAutoRedirectSkipped,
  skipSetupAutoRedirect,
} from './setupReadiness';

type CountBundle = { total?: number };

function countOf(data: unknown): number | undefined {
  return (data as CountBundle | undefined)?.total;
}

/**
 * After login (home `/`), send admins with `setup.view` into `/setup` when the FHIR store
 * has no Location and no Organization yet. Fires at most once per tab session so leaving
 * the wizard does not trap the user.
 */
export function useSetupWizardAutoRedirect(): void {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const flagOn = useFlag('setupWizard');
  const { can } = usePermission('setup.view');
  const skipped = isSetupAutoRedirectSkipped();

  const shouldCheck =
    auth.status === 'authenticated' && flagOn && can && !skipped && pathname === '/';

  const locQ = useSearch(shouldCheck ? 'Location' : undefined, { _summary: 'count' });
  const orgQ = useSearch(shouldCheck ? 'Organization' : undefined, { _summary: 'count' });

  useEffect(() => {
    if (!shouldCheck) return;
    if (locQ.isLoading || orgQ.isLoading || locQ.isError || orgQ.isError) return;
    if (!isInstanceMissingSetupData(countOf(locQ.data), countOf(orgQ.data))) return;

    skipSetupAutoRedirect();
    void navigate('/setup', { replace: true });
  }, [
    shouldCheck,
    locQ.isLoading,
    orgQ.isLoading,
    locQ.isError,
    orgQ.isError,
    locQ.data,
    orgQ.data,
    navigate,
  ]);
}
