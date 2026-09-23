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
  /** Where the provider returns the browser after RP-initiated logout. Defaults to `{origin}/logout`. */
  postLogoutRedirectUri?: string;
  scopes?: readonly string[];
  tokenStore?: TokenStore;
  onTokenRefreshFailure?: () => void | Promise<void>;
}

export type FlagRecord = Readonly<Record<string, boolean>>;

export interface FlagsConfig {
  flags?: FlagRecord;
  defaultValue?: boolean;
}

export type MessageCatalog = Record<
  string,
  string | ((...args: unknown[]) => string)
>;

export interface I18nConfig {
  locale?: string;
  messages?: Partial<MessageCatalog> | MessageCatalog;
  dateFormat?: Intl.DateTimeFormatOptions;
  /**
   * `Intl.DateTimeFormat` options for `formatDateTime`; default `{ dateStyle: 'medium', timeStyle: 'short' }`.
   * Set `timeZone` to show instants in a fixed zone instead of the browser's.
   */
  dateTimeFormat?: Intl.DateTimeFormatOptions;
  numberFormat?: Intl.NumberFormatOptions;
  dir?: 'ltr' | 'rtl';
}

export type CustomEndpoints = Readonly<Record<string, string>>;

export interface CorePlatformConfig {
  fhirBaseUrl: string;
  fhirVersion?: FhirVersion;
  auth: AuthConfig;
  rbac?: RbacConfig;
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
