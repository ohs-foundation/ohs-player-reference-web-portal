import type { ExtensionRoute } from 'ohs-player-web-core';
import type { ReactNode } from 'react';

/** A host app's own page: an extension route plus what to show when its permission is denied. */
export type PortalRoute = ExtensionRoute & { permissionFallback?: ReactNode };
