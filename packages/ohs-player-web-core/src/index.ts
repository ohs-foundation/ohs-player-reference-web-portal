/**
 * @public Library public API surface for `ohs-player-web-core`.
 */

export { OHS_PLAYER_WEB_CORE_VERSION } from './version';

// Types
export type {
  AuthConfig,
  AuthStatus,
  CorePlatformConfig,
  CustomEndpoints,
  FhirVersion,
  FlagsConfig,
  FlagRecord,
  I18nConfig,
  MessageCatalog,
  PermissionMap,
  RbacAdapter,
  RbacConfig,
  ThemeColors,
  ThemeConfig,
  ThemeShadow,
  TokenStore,
  UnauthorizedBehaviour,
  UseAuthResult,
  UsePermissionResult,
  UserProfile,
} from './types/config';

export { CorePlatformProvider } from './providers/CorePlatformProvider';
export { AuthProvider, useAuth, useAuthContext } from './auth/AuthProvider';
export { createMemoryTokenStore, createSessionStorageTokenStore } from './auth/tokenStore';
export { decodeJwtPayload } from './auth/jwt';

export {
  CoreConfigProvider,
  useCoreConfig,
  usePermission,
  useRoles,
} from './providers/CoreConfigProvider';
export { FhirClientProvider, useFhirClient } from './providers/FhirClientProvider';

export { PermissionGuard } from './rbac/PermissionGuard';
export { RoleGuard } from './rbac/RoleGuard';

export { FlagsProvider, useFlag } from './flags/FlagsProvider';
export { FeatureGuard } from './flags/FeatureGuard';

export { I18nProvider, useTranslation } from './i18n/I18nProvider';
export { defaultMessageCatalog } from './i18n/locales/en';
export { swMessageCatalogStub } from './i18n/locales/sw';

export { applyTheme, defaultTheme, mergeTheme } from './theme/theme';

export { FhirClient } from './client/FhirClient';
export { FhirError, isOperationOutcome } from './client/FhirError';

export {
  bundleEntry,
  commitBundle,
  committedId,
  committedReference,
  newUrnUuid,
} from './bundle/transaction';
export type {
  BundleEntryMethod,
  TransactionBundleEntry,
  TransactionResponseBundle,
} from './bundle/transaction';

export {
  useCreateResource,
  useCustomEndpoint,
  useFhirCapabilities,
  useRefreshResources,
  useResource,
  useSearch,
  useUpdateResource,
} from './hooks/useFhirData';

export { formatOperationOutcomeMessage } from './ui/operationOutcome';
export {
  OhsDialog,
  OhsDropdownMenu,
  OhsTabs,
  OhsToast,
  OhsTooltip,
} from './ui/radix';
export type { OhsDialogProps } from './ui/radix';

export { StatusBarProvider, useStatusBar } from './ui/primitives/StatusBar';
export type { StatusTone } from './ui/primitives/StatusBar';

export { writeAuditEvent } from './audit/writeAudit';

export type {
  Questionnaire,
  QuestionnaireAnswerValue,
  QuestionnaireFormProps,
  QuestionnaireFormRenderContext,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  BuildQuestionnaireResponseOptions,
  SelectFieldOption,
} from './sdc';
export {
  buildQuestionnaireResponse,
  formatQuestionnaireCanonical,
  QuestionnaireFields,
  QuestionnaireForm,
  useQuestionnaireFormState,
  validateRequiredAnswers,
} from './sdc';
