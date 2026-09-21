import type { CorePlatformConfig, PortalConfigDocument, ThemeConfigV2 } from 'ohs-player-web-core';
import { DEFAULT_NAVIGATION, type NavEntry } from './navigation';

/** The configuration document as the shell reads it: navigation entries name shell screens. */
export type PortalDocument = Omit<PortalConfigDocument, 'navigation'> & {
  navigation?: readonly NavEntry[];
};

/** The host app's build-time values, used for any field the document leaves out. */
export interface PortalDefaults {
  platform: CorePlatformConfig;
  theme: ThemeConfigV2;
  questionnaireVariant: string;
}

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

/** Merges a configuration document over the host app's defaults, field by field. */
export function resolvePortalConfig(
  defaults: PortalDefaults,
  document: PortalDocument = {},
): ResolvedPortalConfig {
  const { platform, theme } = defaults;
  const productName = document.product?.name;

  return {
    platform: {
      ...platform,
      fhirBaseUrl: document.fhirBaseUrl ?? platform.fhirBaseUrl,
      fhirVersion: document.fhirVersion ?? platform.fhirVersion,
      auth: {
        ...platform.auth,
        issuer: document.oidcIssuer ?? platform.auth.issuer,
        clientId: document.clientId ?? platform.auth.clientId,
      },
      rbac: {
        ...platform.rbac,
        permissionMap: { ...platform.rbac?.permissionMap, ...document.permissionMap },
      },
      flags: {
        ...platform.flags,
        flags: { ...platform.flags?.flags, ...definedValues(document.flags) },
      },
      i18n: {
        ...platform.i18n,
        locale: document.locale ?? platform.i18n?.locale,
        messages: {
          ...platform.i18n?.messages,
          ...document.messages,
          ...(productName ? { appTopbarTitle: productName } : {}),
        },
      },
      customEndpoints: { ...platform.customEndpoints, ...document.customEndpoints },
    },
    theme: {
      ...theme,
      overrides: { ...theme.overrides, ...document.brand?.overrides },
      darkOverrides: { ...theme.darkOverrides, ...document.brand?.darkOverrides },
    },
    navigation: document.navigation ?? DEFAULT_NAVIGATION,
    questionnaireVariant: document.questionnaireVariant ?? defaults.questionnaireVariant,
  };
}
