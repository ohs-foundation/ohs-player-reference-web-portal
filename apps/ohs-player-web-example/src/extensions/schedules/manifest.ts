import { IconToday, type PortalExtension } from 'ohs-player-web-shell';
import { schedulesMessages } from './messages';
import { ViewSchedulesAction } from './ViewSchedulesAction';

const requires = { flag: 'schedules', permission: 'schedules.view' };

export const schedulesExtension: PortalExtension = {
  id: 'schedules',
  routes: [{ id: 'list', path: '/schedules', load: () => import('./SchedulesPage'), requires }],
  nav: [
    {
      id: 'list',
      to: '/schedules',
      labelKey: 'navSchedules',
      order: 15,
      icon: IconToday,
      requires,
    },
  ],
  widgets: [
    {
      id: 'active',
      region: 'kpi',
      order: 50,
      load: () => import('./ActiveSchedulesWidget'),
      requires,
    },
  ],
  slots: [{ id: 'view', slot: 'users.rowActions', order: 10, component: ViewSchedulesAction }],
  messages: schedulesMessages,
  flags: { schedules: true },
  permissions: { 'schedules.view': ['admin', 'care-team-manager'] },
};
