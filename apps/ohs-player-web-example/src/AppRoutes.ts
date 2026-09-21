import type { PortalRoute } from 'ohs-player-web-shell';

export const appRoutes: readonly PortalRoute[] = [
  {
    id: 'users',
    path: '/users',
    load: () => import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
    requires: { flag: 'userMgmt', permission: 'users.view' },
  },
];
