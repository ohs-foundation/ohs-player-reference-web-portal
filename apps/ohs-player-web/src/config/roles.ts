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
