import type { PortalExtension } from 'ohs-player-web-shell';
import { scopeExtension } from './features/scope/manifest';

export const extensions: readonly PortalExtension[] = [scopeExtension];
