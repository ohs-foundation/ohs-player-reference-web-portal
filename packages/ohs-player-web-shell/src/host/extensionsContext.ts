import type { Questionnaire } from 'ohs-player-web-core';
import { createContext, useContext } from 'react';
import type { ExtensionContributions } from './types';

const NO_CONTRIBUTIONS: ExtensionContributions = {
  nav: [],
  routes: [],
  widgets: [],
  slots: [],
  questionnaires: {},
};

export const ExtensionsContext = createContext<ExtensionContributions>(NO_CONTRIBUTIONS);

export function useExtensions(): ExtensionContributions {
  return useContext(ExtensionsContext);
}

/** A questionnaire an extension registered under `key` in its manifest. */
export function useExtensionQuestionnaire(manifestId: string, key: string): Questionnaire | undefined {
  return useExtensions().questionnaires[manifestId]?.[key];
}
