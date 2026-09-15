import type { CorePlatformConfig, ThemeConfigV2 } from 'ohs-player-web-core';
import { sysTheme } from '../theme/sysTheme';
import { env } from './env';
import { DEFAULT_NAVIGATION } from './navigation';
import { platformConfig } from './platform';
import type { NavEntry, PortalConfig } from './portalConfigSchema';

export interface ResolvedPortalConfig {
  platform: CorePlatformConfig;
  theme: ThemeConfigV2;
  navigation: readonly NavEntry[];
  questionnaireVariant: string;
}

function definedValues<T>(record: Partial<Record<string, T>> = {}): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, T] => entry[1] !== undefined),
  );
}

export function resolvePortalConfig(document: PortalConfig = {}): ResolvedPortalConfig {
  const productName = document.product?.name;

  return {
    platform: {
      ...platformConfig,
      fhirBaseUrl: document.fhirBaseUrl ?? platformConfig.fhirBaseUrl,
      fhirVersion: document.fhirVersion ?? platformConfig.fhirVersion,
      auth: {
        ...platformConfig.auth,
        issuer: document.oidcIssuer ?? platformConfig.auth.issuer,
        clientId: document.clientId ?? platformConfig.auth.clientId,
      },
      rbac: {
        ...platformConfig.rbac,
        permissionMap: { ...platformConfig.rbac?.permissionMap, ...document.permissionMap },
      },
      flags: {
        ...platformConfig.flags,
        flags: { ...platformConfig.flags?.flags, ...definedValues(document.flags) },
      },
      i18n: {
        ...platformConfig.i18n,
        locale: document.locale ?? platformConfig.i18n?.locale,
        messages: {
          ...platformConfig.i18n?.messages,
          ...document.messages,
          ...(productName ? { appTopbarTitle: productName } : {}),
        },
      },
      customEndpoints: { ...platformConfig.customEndpoints, ...document.customEndpoints },
    },
    theme: {
      ...sysTheme,
      overrides: { ...sysTheme.overrides, ...document.brand?.overrides },
      darkOverrides: { ...sysTheme.darkOverrides, ...document.brand?.darkOverrides },
    },
    navigation: document.navigation ?? DEFAULT_NAVIGATION,
    questionnaireVariant: document.questionnaireVariant ?? env.questionnaireVariant,
  };
}
