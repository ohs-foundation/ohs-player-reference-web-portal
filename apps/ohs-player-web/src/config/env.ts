/**
 * Vite environment variables for the reference application.
 */
export const env = {
  fhirBaseUrl: (import.meta.env.VITE_FHIR_BASE_URL as string | undefined) ?? 'http://localhost:8080/fhir',
  oidcIssuer:
    (import.meta.env.VITE_OIDC_ISSUER as string | undefined) ??
    'http://localhost:8090/realms/ohs',
  clientId: (import.meta.env.VITE_CLIENT_ID as string | undefined) ?? 'ohs-player-web',
  fhirVersion: import.meta.env.VITE_FHIR_VERSION ?? 'R4',
  themeAlt: import.meta.env.VITE_THEME_ALT === 'true',
  flags: {
    userMgmt: import.meta.env.VITE_FLAG_USER_MGMT !== 'false',
    locationMgmt: import.meta.env.VITE_FLAG_LOCATION_MGMT !== 'false',
    careTeams: import.meta.env.VITE_FLAG_CARE_TEAMS !== 'false',
    dashboard: import.meta.env.VITE_FLAG_DASHBOARD !== 'false',
    orgMgmt: import.meta.env.VITE_FLAG_ORG_MGMT !== 'false',
    setupWizard: import.meta.env.VITE_FLAG_SETUP_WIZARD !== 'false',
    fhirViewer: import.meta.env.VITE_FLAG_FHIR_VIEWER !== 'false',
  },
  /** Which bundled Questionnaire JSON set to use (`src/questionnaires/registry.ts`). */
  questionnaireVariant: import.meta.env.VITE_QUESTIONNAIRE_VARIANT ?? 'default',
} as const;
