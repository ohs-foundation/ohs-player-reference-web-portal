import { useFlag, usePermission, type PortalNavigationEntry } from 'ohs-player-web-core';

export type Requirement = PortalNavigationEntry['requires'];

/** Whether the session meets a `{ flag, permission }` requirement; a missing key always passes. */
export function useRequirement(requires: Requirement): boolean {
  const flagOn = useFlag(requires?.flag ?? '__always_on__');
  const { can } = usePermission(requires?.permission ?? '__always_allowed__');
  return (!requires?.flag || flagOn) && (!requires?.permission || can);
}
