import { describe, expect, it } from 'vitest';
import { buildQuestionnaireResponse } from './buildQuestionnaireResponse';
import type { Questionnaire } from './questionnaireTypes';

const orgQ: Questionnaire = {
  url: 'https://example.org/q',
  version: '1',
  item: [
    { linkId: 'org-name', type: 'string', required: true },
  ],
};

describe('buildQuestionnaireResponse', () => {
  it('sets questionnaire canonical and string answer', () => {
    const qr = buildQuestionnaireResponse({
      questionnaire: orgQ,
      answers: { 'org-name': 'Acme' },
      status: 'completed',
    });
    expect(qr.resourceType).toBe('QuestionnaireResponse');
    expect(qr.questionnaire).toBe('https://example.org/q|1');
    expect(qr.item?.[0]?.linkId).toBe('org-name');
    expect(qr.item?.[0]?.answer?.[0]?.valueString).toBe('Acme');
  });

  it('skips empty optional reference', () => {
    const locQ: Questionnaire = {
      url: 'https://example.org/loc',
      item: [
        { linkId: 'loc-name', type: 'string', required: true },
        { linkId: 'loc-parent', type: 'reference', required: false },
      ],
    };
    const qr = buildQuestionnaireResponse({
      questionnaire: locQ,
      answers: { 'loc-name': 'Clinic', 'loc-parent': '__root__' },
    });
    expect(qr.item?.length).toBe(1);
    expect(qr.item?.[0]?.linkId).toBe('loc-name');
  });
});
