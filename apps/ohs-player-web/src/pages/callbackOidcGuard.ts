let oidcCallbackStarted = false;

export function isOidcCallbackAlreadyStarted(): boolean {
  return oidcCallbackStarted;
}

export function markOidcCallbackStarted(): void {
  oidcCallbackStarted = true;
}

/** Reset between Vitest cases (module-level guard survives remounts). */
export function resetOidcCallbackGuardForTests(): void {
  oidcCallbackStarted = false;
}
