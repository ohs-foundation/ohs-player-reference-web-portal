export const env = {
  fhirBaseUrl: import.meta.env.VITE_FHIR_BASE_URL ?? 'http://localhost:8080/fhir',
  oidcIssuer: import.meta.env.VITE_OIDC_ISSUER ?? 'http://localhost:8090/realms/ohs',
  clientId: import.meta.env.VITE_CLIENT_ID ?? 'ohs-player-web',
  fhirVersion: import.meta.env.VITE_FHIR_VERSION ?? 'R4',
  flags: {
    userMgmt: import.meta.env.VITE_FLAG_USER_MGMT !== 'false',
    dashboard: import.meta.env.VITE_FLAG_DASHBOARD !== 'false',
  },
} as const;
