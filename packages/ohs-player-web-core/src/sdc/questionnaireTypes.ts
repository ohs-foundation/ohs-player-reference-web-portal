/**
 * Minimal FHIR R4 Questionnaire / QuestionnaireResponse shapes for SDC-style capture.
 * @public
 */

/** Questionnaire.item — subset used by {@link QuestionnaireForm}. */
export interface QuestionnaireItem {
  linkId: string;
  text?: string;
  /** FHIR item types; `group` denotes nested items. */
  type?: string;
  required?: boolean;
  repeats?: boolean;
  answerOption?: ReadonlyArray<{
    valueCoding?: { system?: string; code?: string; display?: string };
    valueString?: string;
  }>;
  item?: QuestionnaireItem[];
  /** FHIR extensions — used for layout hints e.g. grid-columns. */
  extension?: ReadonlyArray<{ url: string; valueInteger?: number }>;
}

export interface Questionnaire {
  resourceType?: string;
  url?: string;
  version?: string;
  title?: string;
  status?: string;
  item?: QuestionnaireItem[];
}

export interface QuestionnaireAnswerValue {
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueCoding?: { system?: string; code?: string; display?: string };
  valueReference?: { reference?: string; display?: string };
}

export interface QuestionnaireResponseItem {
  linkId: string;
  answer?: QuestionnaireAnswerValue[];
  item?: QuestionnaireResponseItem[];
}

export interface QuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  questionnaire?: string;
  status?: string;
  authored?: string;
  item?: QuestionnaireResponseItem[];
}
