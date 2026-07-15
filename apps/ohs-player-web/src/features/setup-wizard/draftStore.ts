import { EMPTY_DRAFT, type SetupWizardDraft } from './types';

export const SETUP_WIZARD_STORAGE_KEY = 'ohs.setupWizard.draft.v1';

function isDraft(value: unknown): value is SetupWizardDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<SetupWizardDraft>;
  return (
    d.version === 1 &&
    typeof d.currentStep === 'number' &&
    Array.isArray(d.locations) &&
    Array.isArray(d.organizations) &&
    Array.isArray(d.careTeams) &&
    Array.isArray(d.users)
  );
}

/** Load draft from sessionStorage, or a fresh empty draft when missing/invalid. */
export function loadDraft(): SetupWizardDraft {
  try {
    const raw = sessionStorage.getItem(SETUP_WIZARD_STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT();
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed)) return EMPTY_DRAFT();
    return {
      ...EMPTY_DRAFT(),
      ...parsed,
      urnMap: parsed.urnMap ?? {},
      phase1Complete: Boolean(parsed.phase1Complete),
    };
  } catch {
    return EMPTY_DRAFT();
  }
}

export function saveDraft(draft: SetupWizardDraft): void {
  try {
    sessionStorage.setItem(SETUP_WIZARD_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota / private mode — draft still lives in React state for the session.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(SETUP_WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}
