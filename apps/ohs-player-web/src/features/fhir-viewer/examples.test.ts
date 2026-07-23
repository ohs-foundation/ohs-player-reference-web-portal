import { describe, expect, it } from 'vitest';
import { RESOURCE_EXAMPLES, exampleFor } from './examples';
import { RESOURCE_TYPE_DEFS, displayNameFor, genericDisplayName } from './registry';

describe('bundled resource examples', () => {
  it('provides an example for every registry type, so no type renders a blank table', () => {
    const missing = RESOURCE_TYPE_DEFS.filter((d) => !exampleFor(d.resourceType)).map(
      (d) => d.resourceType,
    );
    expect(missing).toEqual([]);
  });

  it('keys match each example resourceType and every example carries an id', () => {
    for (const [key, example] of Object.entries(RESOURCE_EXAMPLES)) {
      expect(example.resourceType, `${key} resourceType`).toBe(key);
      expect(typeof example.id, `${key} id`).toBe('string');
    }
  });

  it('has no examples for types outside the registry', () => {
    const registryTypes = new Set(RESOURCE_TYPE_DEFS.map((d) => d.resourceType));
    const extra = Object.keys(RESOURCE_EXAMPLES).filter((k) => !registryTypes.has(k));
    expect(extra).toEqual([]);
  });

  it('renders a meaningful display name rather than falling back to Type/id', () => {
    // A bare `Type/id` label makes the placeholder row useless, so every example must carry
    // something nameable. QuestionnaireResponse is the one FHIR type here with no human-facing
    // element (no name/title/description/code), so it legitimately falls through.
    const unnameable = RESOURCE_TYPE_DEFS.filter((def) => {
      const example = exampleFor(def.resourceType);
      return !example || genericDisplayName(example) === `${def.resourceType}/example`;
    }).map((d) => d.resourceType);
    expect(unnameable).toEqual(['QuestionnaireResponse']);
  });

  it('display name resolution works through the registry for a sample of types', () => {
    expect(displayNameFor(RESOURCE_TYPE_DEFS[0], exampleFor('Patient')!)).toBe('Jane Doe');
    expect(displayNameFor(RESOURCE_TYPE_DEFS[3], exampleFor('Organization')!)).toBe(
      'Demo Health Organization',
    );
  });
});
