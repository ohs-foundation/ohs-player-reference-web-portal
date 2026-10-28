import {
  portalConfigIssues,
  validatePortalConfig,
  type PortalConfig,
  type PortalConfigIssue,
} from '../../config/portalConfigSchema';

export type ParsedDraft =
  | { kind: 'invalidJson'; detail: string }
  | { kind: 'notAnObject' }
  | { kind: 'invalid'; value: Record<string, unknown>; issues: PortalConfigIssue[] }
  | { kind: 'valid'; document: PortalConfig };

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; detail: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

export function parseDraft(text: string): ParsedDraft {
  const parsed = parseJson(text);
  if (!parsed.ok) return { kind: 'invalidJson', detail: parsed.detail };
  if (!isJsonObject(parsed.value)) return { kind: 'notAnObject' };

  const result = validatePortalConfig(parsed.value);
  return result.success
    ? { kind: 'valid', document: result.data }
    : { kind: 'invalid', value: parsed.value, issues: portalConfigIssues(parsed.value) };
}

export function draftText(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function draftObject(draft: ParsedDraft): Record<string, unknown> | undefined {
  if (draft.kind === 'valid') return draft.document;
  return draft.kind === 'invalid' ? draft.value : undefined;
}
