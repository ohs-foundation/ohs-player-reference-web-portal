import locationQuestionnaire from './location.questionnaire.json';
import organizationQuestionnaire from './organization.questionnaire.json';
import careTeamQuestionnaire from './careteam.questionnaire.json';
import userQuestionnaire from './user.questionnaire.json';
import userEditQuestionnaire from './user-edit.questionnaire.json';
import { env } from '../config/env';

/** Canonical URLs — keep in sync with bundled JSON `url` fields. */
export const ORGANIZATION_QUESTIONNAIRE_CANONICAL =
  'https://ohs-player.reference.portal/fhir/Questionnaire/organization';
export const LOCATION_QUESTIONNAIRE_CANONICAL =
  'https://ohs-player.reference.portal/fhir/Questionnaire/location';
export const CARETEAM_QUESTIONNAIRE_CANONICAL =
  'https://ohs-player.reference.portal/fhir/Questionnaire/careteam';
export const USER_QUESTIONNAIRE_CANONICAL =
  'https://ohs-player.reference.portal/fhir/Questionnaire/user';
export const USER_EDIT_QUESTIONNAIRE_CANONICAL =
  'https://ohs-player.reference.portal/fhir/Questionnaire/user-edit';

const variants = {
  default: {
    organization: organizationQuestionnaire,
    location: locationQuestionnaire,
    careteam: careTeamQuestionnaire,
    user: userQuestionnaire,
    userEdit: userEditQuestionnaire,
  },
} as const;

export type QuestionnaireVariant = keyof typeof variants;

export function getQuestionnaireVariant(): QuestionnaireVariant {
  const v = env.questionnaireVariant as QuestionnaireVariant | undefined;
  if (v && v in variants) return v;
  return 'default';
}

export function getBundledQuestionnaires(): (typeof variants)['default'] {
  return variants[getQuestionnaireVariant()];
}
