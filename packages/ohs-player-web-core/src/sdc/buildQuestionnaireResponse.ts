import type {
  Questionnaire,
  QuestionnaireAnswerValue,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
} from './questionnaireTypes';

/** Canonical reference string for QuestionnaireResponse.questionnaire (`url|version`). */
export function formatQuestionnaireCanonical(q: Questionnaire): string | undefined {
  if (!q.url) return undefined;
  return q.version ? `${q.url}|${q.version}` : q.url;
}

function parseAnswerForItem(item: QuestionnaireItem, raw: string): QuestionnaireAnswerValue | undefined {
  const t = item.type ?? 'string';
  switch (t) {
    case 'boolean': {
      if (raw === 'true') return { valueBoolean: true };
      if (raw === 'false') return { valueBoolean: false };
      return undefined;
    }
    case 'integer': {
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) return undefined;
      return { valueInteger: n };
    }
    case 'decimal': {
      const n = Number.parseFloat(raw);
      if (Number.isNaN(n)) return undefined;
      return { valueString: String(n) };
    }
    case 'choice': {
      const opts = item.answerOption ?? [];
      for (const opt of opts) {
        const c = opt.valueCoding;
        if (
          c &&
          (c.code === raw || `${c.system ?? ''}|${c.code ?? ''}` === raw)
        ) {
          return {
            valueCoding: {
              system: c.system,
              code: c.code,
              display: c.display,
            },
          };
        }
      }
      return undefined;
    }
    case 'open-choice':
      return { valueString: raw };
    case 'reference': {
      if (!raw || raw === '__root__') return undefined;
      return { valueReference: { reference: raw } };
    }
    case 'string':
    case 'text':
    case 'url':
      return { valueString: raw };
    default:
      return { valueString: raw };
  }
}

function buildNestedResponseItems(
  items: QuestionnaireItem[] | undefined,
  answers: Record<string, string>,
): QuestionnaireResponseItem[] {
  if (!items?.length) return [];
  const out: QuestionnaireResponseItem[] = [];

  for (const it of items) {
    const hasChildren = Boolean(it.item?.length);

    if (hasChildren) {
      const nested = buildNestedResponseItems(it.item, answers);
      if (nested.length > 0) {
        out.push({ linkId: it.linkId, item: nested });
      }
      continue;
    }

    const leafType = it.type ?? 'string';
    if (leafType === 'group') continue;

    const raw = answers[it.linkId];
    if (raw === undefined || raw === '') continue;
    if (leafType === 'reference' && raw === '__root__') continue;

    const value = parseAnswerForItem(it, raw);
    if (!value) continue;

    out.push({
      linkId: it.linkId,
      answer: [value],
    });
  }

  return out;
}

export interface BuildQuestionnaireResponseOptions {
  questionnaire: Questionnaire;
  answers: Record<string, string>;
  /** Default `completed`. */
  status?: QuestionnaireResponse['status'];
  authored?: string;
}

/** Builds a FHIR R4 QuestionnaireResponse from flat answer state keyed by linkId. */
export function buildQuestionnaireResponse(opts: BuildQuestionnaireResponseOptions): QuestionnaireResponse {
  const canonical = formatQuestionnaireCanonical(opts.questionnaire);
  return {
    resourceType: 'QuestionnaireResponse',
    questionnaire: canonical,
    status: opts.status ?? 'completed',
    authored: opts.authored ?? new Date().toISOString(),
    item: buildNestedResponseItems(opts.questionnaire.item, opts.answers),
  };
}

/** Collects linkIds for leaf items that are required but missing or empty in `answers`. */
export function validateRequiredAnswers(
  questionnaire: Questionnaire,
  answers: Record<string, string>,
): string[] {
  const missing: string[] = [];

  function walk(items: QuestionnaireItem[] | undefined): void {
    if (!items) return;
    for (const it of items) {
      if (it.item?.length) {
        walk(it.item);
        continue;
      }
      if (!it.required) continue;
      const raw = answers[it.linkId];
      if (raw === undefined || raw === '') {
        missing.push(it.linkId);
        continue;
      }
      if (it.type === 'reference' && it.required && raw === '__root__') {
        missing.push(it.linkId);
      }
    }
  }

  walk(questionnaire.item);
  return missing;
}
