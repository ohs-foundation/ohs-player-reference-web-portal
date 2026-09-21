import type { ExtensionManifest } from './extension';

/** One reason a manifest is invalid: the field's path and what was expected there. */
export interface ExtensionManifestIssue {
  path: string;
  message: string;
}

/** The dashboard regions and slot names the host declares. */
export interface ExtensionManifestRules {
  regions: readonly string[];
  slots: readonly string[];
}

export type ExtensionManifestValidation<
  Region extends string = string,
  Slots extends Record<string, unknown> = Record<string, unknown>,
> =
  | { success: true; data: ExtensionManifest<Region, Slots> }
  | { success: false; errors: ExtensionManifestIssue[] };

type Issues = ExtensionManifestIssue[];
type ItemCheck = (issues: Issues, item: Record<string, unknown>, path: string) => void;

const MANIFEST_KEYS = [
  'id',
  'routes',
  'nav',
  'widgets',
  'slots',
  'messages',
  'flags',
  'permissions',
  'customEndpoints',
  'questionnaires',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPath(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('/');
}

function isComponent(value: unknown): boolean {
  return typeof value === 'function' || (typeof value === 'object' && value !== null);
}

function oneOf(names: readonly string[]): string {
  return names.map((name) => `"${name}"`).join(', ');
}

function requireThat(issues: Issues, valid: boolean, path: string, message: string): void {
  if (!valid) issues.push({ path, message });
}

function checkRequires(issues: Issues, value: unknown, path: string): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be an object with an optional flag and permission' });
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key !== 'flag' && key !== 'permission') {
      issues.push({
        path: `${path}.${key}`,
        message: 'is not a requirement; expected flag or permission',
      });
    } else {
      requireThat(
        issues,
        entry === undefined || isText(entry),
        `${path}.${key}`,
        'must be a non-empty string',
      );
    }
  }
}

function checkList(issues: Issues, value: unknown, path: string, checkItem: ItemCheck): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: 'must be an array' });
    return;
  }
  const ids = new Set<string>();
  value.forEach((item: unknown, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path: itemPath, message: 'must be an object' });
      return;
    }
    if (!isText(item.id)) {
      issues.push({ path: `${itemPath}.id`, message: 'must be a non-empty string' });
    } else if (ids.has(item.id)) {
      issues.push({
        path: `${itemPath}.id`,
        message: `repeats the id "${item.id}" already used in ${path}`,
      });
    } else {
      ids.add(item.id);
    }
    checkItem(issues, item, itemPath);
  });
}

function checkRecord(
  issues: Issues,
  value: unknown,
  path: string,
  isValid: (entry: unknown) => boolean,
  expected: string,
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path, message: `must be an object whose values are each ${expected}` });
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    requireThat(issues, isValid(entry), `${path}.${key}`, `must be ${expected}`);
  }
}

const checkRoute: ItemCheck = (issues, route, path) => {
  requireThat(issues, isPath(route.path), `${path}.path`, 'must be a path starting with "/"');
  requireThat(
    issues,
    typeof route.load === 'function',
    `${path}.load`,
    'must be a function that imports the page',
  );
  checkRequires(issues, route.requires, `${path}.requires`);
};

const checkNavEntry: ItemCheck = (issues, entry, path) => {
  requireThat(issues, isPath(entry.to), `${path}.to`, 'must be a path starting with "/"');
  requireThat(
    issues,
    isText(entry.labelKey),
    `${path}.labelKey`,
    'must be a non-empty message key',
  );
  requireThat(issues, Number.isInteger(entry.order), `${path}.order`, 'must be an integer');
  for (const key of ['icon', 'activeIcon']) {
    requireThat(
      issues,
      entry[key] === undefined || isComponent(entry[key]),
      `${path}.${key}`,
      'must be a component',
    );
  }
  checkRequires(issues, entry.requires, `${path}.requires`);
};

function widgetCheck(regions: readonly string[]): ItemCheck {
  return (issues, widget, path) => {
    const known = typeof widget.region === 'string' && regions.includes(widget.region);
    requireThat(issues, known, `${path}.region`, `must be one of ${oneOf(regions)}`);
    requireThat(issues, Number.isInteger(widget.order), `${path}.order`, 'must be an integer');
    requireThat(
      issues,
      typeof widget.load === 'function',
      `${path}.load`,
      'must be a function that imports the widget',
    );
    checkRequires(issues, widget.requires, `${path}.requires`);
  };
}

function slotCheck(slots: readonly string[]): ItemCheck {
  return (issues, contribution, path) => {
    const known = typeof contribution.slot === 'string' && slots.includes(contribution.slot);
    requireThat(issues, known, `${path}.slot`, `must name a slot: ${oneOf(slots)}`);
    requireThat(
      issues,
      Number.isInteger(contribution.order),
      `${path}.order`,
      'must be an integer',
    );
    requireThat(
      issues,
      isComponent(contribution.component),
      `${path}.component`,
      'must be a component',
    );
  };
}

/**
 * Checks an extension manifest's shape against the host's regions and slots, before the host
 * merges it. Ids must be unique within each list. Permission mappings are checked by the host.
 */
export function validateExtensionManifest<
  Region extends string = string,
  Slots extends Record<string, unknown> = Record<string, unknown>,
>(input: unknown, rules: ExtensionManifestRules): ExtensionManifestValidation<Region, Slots> {
  if (!isRecord(input)) {
    return { success: false, errors: [{ path: '', message: 'must be an object' }] };
  }

  const issues: Issues = [];
  requireThat(issues, isText(input.id), 'id', 'must be a non-empty string');
  for (const key of Object.keys(input)) {
    requireThat(
      issues,
      MANIFEST_KEYS.includes(key),
      key,
      `is not a manifest key; expected ${oneOf(MANIFEST_KEYS)}`,
    );
  }
  checkList(issues, input.routes, 'routes', checkRoute);
  checkList(issues, input.nav, 'nav', checkNavEntry);
  checkList(issues, input.widgets, 'widgets', widgetCheck(rules.regions));
  checkList(issues, input.slots, 'slots', slotCheck(rules.slots));
  checkRecord(issues, input.messages, 'messages', (entry) => typeof entry === 'string', 'a string');
  checkRecord(issues, input.flags, 'flags', (entry) => typeof entry === 'boolean', 'a boolean');
  checkRecord(
    issues,
    input.permissions,
    'permissions',
    (entry) => Array.isArray(entry) && entry.every(isText),
    'an array of role names',
  );
  checkRecord(issues, input.customEndpoints, 'customEndpoints', isPath, 'a path starting with "/"');
  checkRecord(issues, input.questionnaires, 'questionnaires', isRecord, 'a Questionnaire object');

  return issues.length > 0
    ? { success: false, errors: issues }
    : { success: true, data: input as unknown as ExtensionManifest<Region, Slots> };
}
