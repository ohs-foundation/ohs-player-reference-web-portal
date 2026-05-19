/**
 * Reference app — Vite `import.meta.env` contract.
 */
interface ImportMetaEnv {
  readonly VITE_FHIR_BASE_URL: string;
  readonly VITE_OIDC_ISSUER: string;
  readonly VITE_CLIENT_ID: string;
  readonly VITE_FHIR_VERSION?: string;
  readonly VITE_FLAG_USER_MGMT?: string;
  readonly VITE_FLAG_LOCATION_MGMT?: string;
  readonly VITE_FLAG_CARE_TEAMS?: string;
  readonly VITE_FLAG_DASHBOARD?: string;
  readonly VITE_FLAG_ORG_MGMT?: string;
  readonly VITE_THEME_ALT?: string;
  /** Bundled questionnaire variant key (`registry.ts`). Default variant when omitted. */
  readonly VITE_QUESTIONNAIRE_VARIANT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
