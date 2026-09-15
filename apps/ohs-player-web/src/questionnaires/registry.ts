import locationQuestionnaire from './location.questionnaire.json';
import careTeamQuestionnaire from './careteam.questionnaire.json';
import userQuestionnaire from './user.questionnaire.json';
import userEditQuestionnaire from './user-edit.questionnaire.json';

/** Canonical URLs — keep in sync with bundled JSON `url` fields. */
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
    location: locationQuestionnaire,
    careteam: careTeamQuestionnaire,
    user: userQuestionnaire,
    userEdit: userEditQuestionnaire,
  },
} as const;

export type QuestionnaireVariant = keyof typeof variants;

export function getQuestionnaireVariant(requested?: string): QuestionnaireVariant {
  const v = requested as QuestionnaireVariant | undefined;
  if (v && v in variants) return v;
  return 'default';
}

export function getBundledQuestionnaires(requested?: string): (typeof variants)['default'] {
  return variants[getQuestionnaireVariant(requested)];
}
