/**
 * The display noun for a FHIR resource type: the catalogue's `resourceType<Type>` message
 * (`resourceTypePractitioner`, `resourceTypeLocation`, ...), else the type name itself.
 * A label whose text equals its own key reads as missing and falls back to the type name.
 */
export function resourceTypeLabel(t: (key: string) => string, resourceType: string): string {
  const key = `resourceType${resourceType}`;
  const label = t(key);
  return label === key ? resourceType : label;
}
