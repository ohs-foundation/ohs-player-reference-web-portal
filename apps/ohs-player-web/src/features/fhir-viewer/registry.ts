/**
 * FHIR Viewer resource-type registry — the single extensibility point. One entry per FHIR R4 type
 * shown in the sidebar, in design order. Adding a type is one row here + one i18n label; no screens,
 * routes, or components change. Every `resourceType` MUST be a valid FHIR R4 type present in the
 * backend CapabilityStatement — enforced by `registry.test.ts`, so nothing non-FHIR can ever ship.
 *
 * `searchParam`/`statusFacet` are set from what each type ACTUALLY declares as a search parameter
 * (backend wins over the design's uniform "search by name or identifier"): HumanName/name types
 * search by `name`; the rest by `_id`. Display is derived generically from the resource.
 */

export type FhirRecord = Record<string, unknown>;

export interface ResourceTypeDef {
  /** FHIR R4 resourceType — the URL segment, CapabilityStatement key, and search/read type. */
  resourceType: string;
  /** i18n key for the sidebar + heading label (FHIR spec spelling, humanised). */
  labelKey: string;
  /** Which FHIR search param the free-text box maps the query into. */
  searchParam: SearchParam;
  /** Status facet the filter exposes, when the type declares a plain `active`/`status` search param. */
  statusFacet?: StatusFacet;
  /** Optional per-type display-name override (defaults to {@link genericDisplayName}). */
  displayName?: (resource: FhirRecord) => string;
}

export type SearchParam = 'name' | 'identifier' | '_id';
export type StatusFacet = 'active' | 'status';

// ─── display derivation ──────────────────────────────────────────────────────

function asRecord(value: unknown): FhirRecord | undefined {
  return value && typeof value === 'object' ? (value as FhirRecord) : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function humanName(resource: FhirRecord): string | undefined {
  const first = Array.isArray(resource.name) ? asRecord(resource.name[0]) : undefined;
  if (!first) return undefined;
  const given = Array.isArray(first.given)
    ? first.given.filter((g): g is string => typeof g === 'string').join(' ')
    : '';
  const full = [given, str(first.family) ?? ''].filter(Boolean).join(' ').trim();
  return full || str(first.text);
}

/**
 * Best text for a CodeableConcept, a bare Coding, a `0..*` array of either, or a plain code string
 * (e.g. `MeasureReport.type`). Covers the shapes FHIR uses for the "what is this" element.
 */
function codeableText(value: unknown): string | undefined {
  const first: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
  if (typeof first === 'string') return str(first);
  const c = asRecord(first);
  if (!c) return undefined;
  const coding = Array.isArray(c.coding) ? asRecord(c.coding[0]) : undefined;
  return (
    str(c.text) ?? str(coding?.display) ?? str(coding?.code) ?? str(c.display) ?? str(c.code)
  );
}

/** `Type/id` fallback when a resource has no human-friendly label. */
export function idReference(resource: FhirRecord): string {
  return `${str(resource.resourceType) ?? 'Resource'}/${str(resource.id) ?? '—'}`;
}

/**
 * Best-effort human label for any resource: HumanName → name/title/description → the defining
 * coded element (code/type/class/medication/vaccine) → `Type/id`. A few resources (e.g.
 * QuestionnaireResponse) genuinely carry no human-facing label and fall through to `Type/id`.
 */
export function genericDisplayName(resource: FhirRecord): string {
  return (
    humanName(resource) ??
    str(resource.name) ??
    str(resource.title) ??
    str(resource.description) ??
    codeableText(resource.description) ??
    codeableText(resource.code) ??
    codeableText(resource.type) ??
    codeableText(resource.class) ??
    codeableText(resource.medicationCodeableConcept) ??
    codeableText(resource.vaccineCode) ??
    idReference(resource)
  );
}

export function displayNameFor(def: ResourceTypeDef, resource: FhirRecord): string {
  return def.displayName?.(resource) ?? genericDisplayName(resource);
}

/** Two-letter uppercase initials for the drawer avatar, derived from a display name. */
export function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2 ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}` : (parts[0] ?? name).slice(0, 2);
  return (initials || '?').toUpperCase();
}

// ─── the 34 types (design order) ──────────────────────────────────────────────

type Entry = readonly [resourceType: string, searchParam: SearchParam, statusFacet?: StatusFacet];

const ENTRIES: readonly Entry[] = [
  ['Patient', 'name', 'active'],
  ['Practitioner', 'name', 'active'],
  ['PractitionerRole', '_id', 'active'],
  ['Organization', 'name', 'active'],
  ['Encounter', '_id', 'status'],
  ['Observation', '_id', 'status'],
  ['Condition', '_id'],
  ['Procedure', '_id', 'status'],
  ['Questionnaire', 'name', 'status'],
  ['QuestionnaireResponse', '_id', 'status'],
  ['RelatedPerson', 'name', 'active'],
  // Design label "Medication Required" is not a FHIR R4 type — ships as its real backend type.
  ['MedicationRequest', '_id', 'status'],
  ['MedicationStatement', '_id', 'status'],
  ['AllergyIntolerance', '_id'],
  ['Appointment', '_id', 'status'],
  ['Immunization', '_id', 'status'],
  ['DiagnosticReport', '_id', 'status'],
  ['CarePlan', '_id', 'status'],
  ['CareTeam', '_id', 'status'],
  ['Claim', '_id', 'status'],
  ['CodeSystem', 'name', 'status'],
  ['Coverage', '_id', 'status'],
  ['DocumentReference', '_id', 'status'],
  ['Goal', '_id'],
  ['Group', '_id'],
  ['Location', 'name', 'status'],
  ['MeasureReport', '_id', 'status'],
  ['Medication', '_id', 'status'],
  ['MedicationAdministration', '_id', 'status'],
  ['PlanDefinition', 'name', 'status'],
  ['ServiceRequest', '_id', 'status'],
  ['Specimen', '_id', 'status'],
  ['SupplyDelivery', '_id', 'status'],
  ['Task', '_id', 'status'],
];

export const RESOURCE_TYPE_DEFS: readonly ResourceTypeDef[] = ENTRIES.map(
  ([resourceType, searchParam, statusFacet]) => ({
    resourceType,
    labelKey: `fhirType${resourceType}`,
    searchParam,
    statusFacet,
  }),
);

const BY_TYPE = new Map(RESOURCE_TYPE_DEFS.map((def) => [def.resourceType, def]));

export function resourceTypeDef(resourceType: string | undefined): ResourceTypeDef | undefined {
  return resourceType ? BY_TYPE.get(resourceType) : undefined;
}

/** i18n key for the free-text search placeholder, adapted to what the type is searchable by. */
export function searchPlaceholderKey(def: ResourceTypeDef): string {
  switch (def.searchParam) {
    case 'name':
      return 'fhirViewerSearchByName';
    case 'identifier':
      return 'fhirViewerSearchByIdentifier';
    default:
      return 'fhirViewerSearchById';
  }
}
