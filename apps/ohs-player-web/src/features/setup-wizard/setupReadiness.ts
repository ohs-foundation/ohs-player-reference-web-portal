/** Session flag: auto-redirect to `/setup` already fired (or should not fire again). */
export const SETUP_WIZARD_SKIP_AUTO_REDIRECT_KEY = 'ohs.setupWizard.skipAutoRedirect';

export function isSetupAutoRedirectSkipped(): boolean {
  try {
    return sessionStorage.getItem(SETUP_WIZARD_SKIP_AUTO_REDIRECT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Prevent further post-login redirects to the wizard for this browser tab session. */
export function skipSetupAutoRedirect(): void {
  try {
    sessionStorage.setItem(SETUP_WIZARD_SKIP_AUTO_REDIRECT_KEY, '1');
  } catch {
    // private mode / quota — redirect may repeat until storage works
  }
}

/**
 * Fresh / unconfigured instance: no Location and no Organization resources yet.
 * Matches dashboard `_summary=count` semantics; no dedicated setup-status API exists.
 */
export function isInstanceMissingSetupData(
  locationTotal: number | undefined,
  organizationTotal: number | undefined,
): boolean {
  return locationTotal === 0 && organizationTotal === 0;
}
