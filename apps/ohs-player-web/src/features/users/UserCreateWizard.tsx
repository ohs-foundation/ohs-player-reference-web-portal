import { useState } from 'react';
import { RiCloseLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES } from '../../config/roles';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import {
  UserBasicInfoStep,
  UserCareTeamFields,
  UserLocationFields,
  UserOrganizationFields,
  UserRoleStatusStep,
} from './UserCreateFormSections';
import { useUserCreateForm } from './useUserCreateForm';

const WIZARD_STEPS = [
  'wizardStepBasic',
  'wizardStepRole',
  'wizardStepOrganization',
  'wizardStepLocation',
  'wizardStepCareTeams',
  'wizardStepReview',
] as const;

export function UserCreateWizard({
  onClose,
  onSuccess,
  onBack,
}: Readonly<{
  onClose: () => void;
  onSuccess: (created?: { id?: string } & Record<string, unknown>) => void;
  onBack?: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const form = useUserCreateForm(onSuccess);
  const [step, setStep] = useState(0);
  const isReview = step === WIZARD_STEPS.length - 1;
  const stepKey = WIZARD_STEPS[step];

  const goBack = (): void => {
    if (step === 0) {
      onBack?.() ?? onClose();
      return;
    }
    setStep((s) => s - 1);
  };

  const goNext = (): void => {
    if (!form.validateStep(step)) return;
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('addUserWizardTitle')}</h2>
        <p className="ohs-form-drawer__subtitle">{t(stepKey)}</p>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={goBack} disabled={form.submitting}>
        {t('back')}
      </Button>
      {isReview ? (
        <Button
          type="button"
          onClick={form.submit}
          loading={form.submitting}
          disabled={form.submitting}
          style={{ marginLeft: 'auto' }}
        >
          {t('createUser')}
        </Button>
      ) : (
        <Button type="button" onClick={goNext} style={{ marginLeft: 'auto' }}>
          {t('next')}
        </Button>
      )}
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('addUserWizardTitle')} header={header} footer={footer}>
      <div className="ohs-detail-body">
        <nav className="ohs-wizard-stepper" aria-label={t('wizardProgress')}>
          {WIZARD_STEPS.map((key, i) => (
            <span
              key={key}
              className={[
                'ohs-wizard-stepper__item',
                i === step ? 'ohs-wizard-stepper__item--active' : '',
                i < step ? 'ohs-wizard-stepper__item--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="ohs-wizard-stepper__dot" aria-hidden="true">
                {i + 1}
              </span>
              <span className="ohs-wizard-stepper__label">{t(key)}</span>
            </span>
          ))}
        </nav>

        {form.error ? <ErrorState description={form.error} /> : null}

        {step === 0 ? <UserBasicInfoStep form={form} /> : null}
        {step === 1 ? <UserRoleStatusStep form={form} /> : null}
        {step === 2 ? <UserOrganizationFields form={form} /> : null}
        {step === 3 ? <UserLocationFields form={form} /> : null}
        {step === 4 ? <UserCareTeamFields form={form} /> : null}
        {step === 5 ? (
          <UserCreateReview form={form} />
        ) : null}
      </div>
    </Drawer>
  );
}

function ReviewRow({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div className="ohs-wizard-review__row">
      <dt className="ohs-wizard-review__label">{label}</dt>
      <dd className="ohs-wizard-review__value">{value}</dd>
    </div>
  );
}

function UserCreateReview({
  form,
}: Readonly<{
  form: ReturnType<typeof useUserCreateForm>;
}>): React.ReactElement {
  const { t } = useTranslation();
  const fullName = `${form.given} ${form.family}`.trim() || t('detailNone');

  return (
    <Stack gap={4}>
      <p className="ohs-wizard-review__intro">{t('wizardReviewIntro')}</p>
      <dl className="ohs-wizard-review">
        <ReviewRow label={t('columnName')} value={fullName} />
        <ReviewRow label={t('emailAddress')} value={form.email || t('detailNone')} />
        <ReviewRow label={t('phoneNumber')} value={form.phone || t('detailNone')} />
        <ReviewRow
          label={t('gender')}
          value={form.gender ? form.labelForOption(GENDER_OPTIONS, form.gender) : t('detailNone')}
        />
        <ReviewRow label={t('dateOfBirth')} value={form.dob || t('detailNone')} />
        <ReviewRow label={t('nationalId')} value={form.nationalId || t('detailNone')} />
        <ReviewRow
          label={t('columnRole')}
          value={form.role ? form.labelForOption(PRACTITIONER_ROLE_CODES, form.role) : t('detailNone')}
        />
        <ReviewRow
          label={t('columnStatus')}
          value={form.statusActive === 'active' ? t('statusActive') : t('statusInactive')}
        />
        <ReviewRow
          label={t('contextOrganization')}
          value={form.labelsForValues(form.orgOptions, form.orgs)}
        />
        <ReviewRow
          label={t('contextLocation')}
          value={form.labelsForValues(form.locOptions, form.locations)}
        />
        <ReviewRow
          label={t('sectionCareTeams')}
          value={form.labelsForValues(form.careTeamOptions, form.careTeamIds)}
        />
      </dl>
    </Stack>
  );
}
