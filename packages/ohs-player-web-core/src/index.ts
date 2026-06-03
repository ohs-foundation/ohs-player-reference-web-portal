/**
 * @public Library public API surface for `ohs-player-web-core`.
 */

// Register Material Web components before any JSX uses them.
import './ui/m3/imports';
import './ui/primitives/theme.css';
import './ui/m3/m3-bridge.css';

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
  useCreateResource,
  useCustomEndpoint,
  useFhirCapabilities,
  useResource,
  useSearch,
  useUpdateResource,
} from './hooks/useFhirData';

export { formatOperationOutcomeMessage } from './ui/operationOutcome';
export { OhsDialog, OhsToast, OhsTooltip } from './ui/radix';
export { OhsDropdownMenu } from './ui/m3/OhsM3DropdownMenu';
export { OhsM3Tabs as OhsTabs } from './ui/m3/OhsM3Tabs';
export { OhsM3Dialog } from './ui/m3/OhsM3Dialog';

// Token-driven primitive kit (Material 3 via @material/web + OHS field shell)
export {
  Button,
  Card,
  CardHeader,
  Checkbox,
  ChipSet,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterChip,
  IconButton,
  Inline,
  LinearProgress,
  Page,
  PageHeader,
  SelectField,
  Spinner,
  Stack,
  StatusBadge,
  StatusBarProvider,
  Switch,
  TextAreaField,
  TextField,
  useStatusBar,
} from './ui/primitives';
export type {
  ButtonProps,
  ButtonSize,
  ButtonVariant,
  CardHeaderProps,
  CardProps,
  CheckboxProps,
  ChipSetProps,
  DataTableColumn,
  DataTableProps,
  EmptyStateProps,
  ErrorStateProps,
  FieldRootProps,
  FieldStyle,
  FilterChipProps,
  IconButtonProps,
  InlineProps,
  LinearProgressProps,
  PageHeaderProps,
  PageProps,
  SelectFieldOption,
  SelectFieldProps,
  StackProps,
  StatusBadgeProps,
  StatusTone,
  SwitchProps,
  TextAreaFieldProps,
  TextFieldProps,
} from './ui/primitives';
export type { OhsM3DialogProps } from './ui/m3/OhsM3Dialog';

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
} from './sdc';
export {
  buildQuestionnaireResponse,
  formatQuestionnaireCanonical,
  QuestionnaireFields,
  QuestionnaireForm,
  useQuestionnaireFormState,
  validateRequiredAnswers,
} from './sdc';
