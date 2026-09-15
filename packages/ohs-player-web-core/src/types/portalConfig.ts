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
}
