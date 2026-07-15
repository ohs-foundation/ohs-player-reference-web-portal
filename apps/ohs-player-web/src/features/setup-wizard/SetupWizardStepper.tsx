import { useTranslation } from 'ohs-player-web-core';
import { SETUP_WIZARD_STEPS, type SetupWizardDraft, type SetupWizardStepId } from './types';

const STEP_LABEL_KEYS: Record<SetupWizardStepId, string> = {
  locations: 'setupStepLocations',
  organizations: 'setupStepOrganizations',
  careteams: 'setupStepCareTeams',
  users: 'setupStepUsers',
  review: 'setupStepReview',
};

function countForStep(draft: SetupWizardDraft, id: SetupWizardStepId): number {
  if (id === 'locations') return draft.locations.length;
  if (id === 'organizations') return draft.organizations.length;
  if (id === 'careteams') return draft.careTeams.length;
  if (id === 'users') return draft.users.length;
  return (
    draft.locations.length +
    draft.organizations.length +
    draft.careTeams.length +
    draft.users.length
  );
}

export function SetupWizardStepper({
  currentStep,
  maxReachable,
  draft,
  onSelect,
}: Readonly<{
  currentStep: number;
  maxReachable: number;
  draft: SetupWizardDraft;
  onSelect?: (index: number) => void;
}>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <nav className="ohs-wizard-stepper" aria-label={t('setupWizardProgress')}>
      {SETUP_WIZARD_STEPS.map((id, i) => {
        const reachable = i <= maxReachable;
        const count = countForStep(draft, id);
        return (
          <button
            key={id}
            type="button"
            disabled={!reachable || !onSelect}
            onClick={() => onSelect?.(i)}
            className={[
              'ohs-wizard-stepper__item',
              'ohs-wizard-stepper__item--button',
              i === currentStep ? 'ohs-wizard-stepper__item--active' : '',
              i < currentStep ? 'ohs-wizard-stepper__item--done' : '',
              !reachable ? 'ohs-wizard-stepper__item--locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={i === currentStep ? 'step' : undefined}
          >
            <span className="ohs-wizard-stepper__dot" aria-hidden="true">
              {i + 1}
            </span>
            <span className="ohs-wizard-stepper__label">{t(STEP_LABEL_KEYS[id])}</span>
            {count > 0 && id !== 'review' ? (
              <span className="ohs-wizard-stepper__count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
