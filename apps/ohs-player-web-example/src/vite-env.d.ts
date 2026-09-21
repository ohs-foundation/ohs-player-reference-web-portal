interface ImportMetaEnv {
  readonly VITE_FHIR_BASE_URL?: string;
  readonly VITE_OIDC_ISSUER?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_FHIR_VERSION?: string;
  readonly VITE_FLAG_USER_MGMT?: string;
  readonly VITE_FLAG_DASHBOARD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
