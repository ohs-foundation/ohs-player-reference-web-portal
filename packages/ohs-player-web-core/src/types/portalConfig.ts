import type { ThemeConfigV2 } from '../theme/themeCss';
import type { FhirVersion, PermissionMap } from './config';

export interface PortalNavigationEntry {
  id: string;
  to: string;
  labelKey: string;
  order: number;
  requires?: {
    flag?: string;
    permission?: string;
  };
}

/** Dashboard cards per region, by widget id, in render order. */
export interface PortalDashboardLayout {
  kpi?: readonly string[];
  main?: readonly string[];
  side?: readonly string[];
}

/**
 * The dashboard a deployment starts users from. `layout` replaces the default layout as a whole,
 * a region it leaves out is empty. `available` lists the widget ids, or `<prefix>.*` patterns, a
 * user may add. `userCustomization: false` hides the editing controls.
 */
export interface PortalDashboardConfig {
  layout?: PortalDashboardLayout;
  available?: readonly string[];
  userCustomization?: boolean;
}

export interface PortalConfigDocument {
  $schema?: string;
  product?: {
    name?: string;
  };
  fhirBaseUrl?: string;
  fhirVersion?: FhirVersion;
  oidcIssuer?: string;
  clientId?: string;
  brand?: Pick<ThemeConfigV2, 'overrides' | 'darkOverrides'>;
  flags?: Partial<Record<string, boolean>>;
  navigation?: readonly PortalNavigationEntry[];
  permissionMap?: PermissionMap;
  locale?: string;
  messages?: Readonly<Record<string, string>>;
  customEndpoints?: Readonly<Record<string, string>>;
  questionnaireVariant?: string;
  dashboard?: PortalDashboardConfig;
}
