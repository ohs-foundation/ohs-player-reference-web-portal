import type { PortalExtension } from 'ohs-player-web-shell';
import { schedulesExtension } from './extensions/schedules/manifest';

export const extensions: readonly PortalExtension[] = [schedulesExtension];
