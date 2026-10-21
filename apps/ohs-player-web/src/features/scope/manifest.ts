import type { PortalExtension } from 'ohs-player-web-shell';
import { ScopeIndicator } from './ScopeIndicator';

export const scopeExtension: PortalExtension = {
  id: 'scope',
  slots: [{ id: 'indicator', slot: 'topbar.actions', order: 10, component: ScopeIndicator }],
};
