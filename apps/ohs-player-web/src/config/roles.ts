export interface RoleOption {
  value: string;
  label: string;
}

/**
 * System (Keycloak realm) roles assignable to a user. Static for the alpha
 * (roadmap Open Question 4); align with `infra/keycloak/ohs-realm.json` realm roles.
 */
export const ASSIGNABLE_ROLES: readonly RoleOption[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'care-team-manager', label: 'Care team manager' },
];

/** CodeSystem for `PractitionerRole.code` on Organisation/Location assignments. */
export const PRACTITIONER_ROLE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/practitioner-role';

export const PRACTITIONER_ROLE_CODES: readonly RoleOption[] = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'teacher', label: 'Teacher / educator' },
];

/** FHIR `administrative-gender` codes for the create form's Gender select. */
export const GENDER_OPTIONS: readonly RoleOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];
