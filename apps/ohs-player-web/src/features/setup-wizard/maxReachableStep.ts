import { SETUP_WIZARD_STEPS, type SetupWizardDraft } from './types';

/** Highest step index unlocked by draft content (and current visit). */
export function maxReachableStep(draft: SetupWizardDraft, currentStep: number): number {
  if (draft.phase1Complete) return SETUP_WIZARD_STEPS.length - 1;
  let max = 0;
  if (draft.locations.length > 0) max = 1;
  if (draft.organizations.length > 0) max = 4;
  return Math.max(max, currentStep);
}
