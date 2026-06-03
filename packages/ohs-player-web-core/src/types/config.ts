/** FHIR API and identity configuration types for {@link CorePlatformProvider}. */

export type FhirVersion = 'R4' | 'R5' | 'STU3';

export type PermissionMap = Readonly<Record<string, readonly string[]>>;

export interface RbacAdapter {
  getRoles(): Promise<string[] | readonly string[]>;
  hasPermission(permission: string): Promise<boolean>;
}

export type UnauthorizedBehaviour = 'hide' | 'disable' | 'redirect';

export interface RbacConfig {
  claimPath?: string;
  permissionMap: PermissionMap;
  unauthorizedBehaviour?: UnauthorizedBehaviour;
  unauthorizedRedirectPath?: string;
  adapter?: RbacAdapter;
}

export interface TokenStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface AuthConfig {
  issuer: string;
  clientId: string;
  redirectUri?: string;
  scopes?: readonly string[];
  tokenStore?: TokenStore;
  onTokenRefreshFailure?: () => void | Promise<void>;
}

export type FlagRecord = Readonly<Record<string, boolean>>;

export interface FlagsConfig {
  flags?: FlagRecord;
  defaultValue?: boolean;
}

export interface ThemeColors {
  primary?: string;
  /** Hover/active state for primary surfaces. Material 3: a darker tone of primary. */
  primaryHover?: string;
  /** Foreground colour rendered on top of `primary` (M3 `onPrimary`). */
  primaryContrast?: string;
  /** Tonal container variant of primary (M3 `primaryContainer`). */
  primaryContainer?: string;
  secondary?: string;
  /** Card/panel background (M3 `surface`). */
  surface?: string;
  /** Page-level background (M3 `surfaceVariant`). */
  background?: string;
  /** Default body text colour (M3 `onSurface`). */
  text?: string;
  /** Secondary/muted text colour (M3 `onSurfaceVariant`). */
  textMuted?: string;
  /** Borders, dividers, outlines (M3 `outline`). */
  border?: string;
  /** Focus-ring colour, typically a translucent primary. */
  focusRing?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
}

export interface ThemeTypography {
  fontFamily?: string;
  headingFontFamily?: string;
  baseFontSize?: number;
}

export interface ThemeBorderRadius {
  default?: number;
}

export interface ThemeShadow {
  /** M3 elevation level 1 (cards). */
  sm?: string;
  /** M3 elevation level 2 (dialogs, dropdowns). */
  md?: string;
  /** M3 elevation level 3 (toasts, popovers). */
  lg?: string;
}

export interface ThemeConfig {
  colors?: ThemeColors;
  typography?: ThemeTypography;
  spacing?: { unit?: number };
  borderRadius?: ThemeBorderRadius;
  shadow?: ThemeShadow;
}

export type MessageCatalog = Record<
  string,
  string | ((...args: unknown[]) => string)
>;

export interface I18nConfig {
  locale?: string;
  messages?: Partial<MessageCatalog> | MessageCatalog;
  dateFormat?: Intl.DateTimeFormatOptions;
  numberFormat?: Intl.NumberFormatOptions;
  dir?: 'ltr' | 'rtl';
}

export type CustomEndpoints = Readonly<Record<string, string>>;

export interface CorePlatformConfig {
  fhirBaseUrl: string;
  fhirVersion?: FhirVersion;
  auth: AuthConfig;
  rbac?: RbacConfig;
  theme?: ThemeConfig;
  flags?: FlagsConfig;
  i18n?: I18nConfig;
  customEndpoints?: CustomEndpoints;
  onError?: (error: unknown) => void;
}

export interface UserProfile {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
}

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error';

export interface UseAuthResult {
  status: AuthStatus;
  user: UserProfile | null;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** Completes the Authorization Code + PKCE redirect callback (call once on `/callback`). */
  handleRedirectCallback: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export interface UsePermissionResult {
  can: boolean;
  roles: readonly string[];
}
