import {
  RiBriefcaseLine,
  RiBuildingLine,
  RiMapPinLine,
  RiTeamLine,
  RiUserLine,
} from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES } from '../../config/roles';
import { Stack } from '../../components/ui';
import {
  MultiSelect,
  RadioRow,
  Section,
  StackedInput,
  StackedSelect,
} from './userFormControls';
import type { UserCreateFormState } from './useUserCreateForm';

type Form = Pick<
  UserCreateFormState,
  | 'given'
  | 'setGiven'
  | 'family'
  | 'setFamily'
  | 'email'
  | 'setEmail'
  | 'phone'
  | 'setPhone'
  | 'gender'
  | 'setGender'
  | 'dob'
  | 'setDob'
  | 'nationalId'
  | 'setNationalId'
  | 'role'
  | 'setRole'
  | 'statusActive'
  | 'setStatusActive'
  | 'orgs'
  | 'setOrgs'
  | 'locations'
  | 'setLocations'
  | 'careTeamIds'
  | 'setCareTeamIds'
  | 'orgOptions'
  | 'locOptions'
  | 'careTeamOptions'
  | 'fieldErrors'
  | 'clearError'
>;

export function UserBasicInfoFields({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();
  const { fieldErrors, clearError } = form;

  return (
    <Section icon={RiUserLine} title={t('sectionBasicInfo')}>
      <Stack gap={5}>
        <div className="ohs-detail-grid">
          <StackedInput
            label={t('givenName')}
            required
            value={form.given}
            error={fieldErrors.givenName}
            onChange={(v) => {
              form.setGiven(v);
              clearError('givenName');
            }}
          />
          <StackedInput
            label={t('familyName')}
            required
            value={form.family}
            error={fieldErrors.familyName}
            onChange={(v) => {
              form.setFamily(v);
              clearError('familyName');
            }}
          />
          <StackedInput
            label={t('emailAddress')}
            type="email"
            required
            value={form.email}
            error={fieldErrors.email}
            onChange={(v) => {
              form.setEmail(v);
              clearError('email');
            }}
          />
          <StackedInput
            label={t('phoneNumber')}
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(v) => {
              form.setPhone(v);
              clearError('phone');
            }}
          />
          <StackedInput
            label={t('dateOfBirth')}
            type="date"
            value={form.dob}
            error={fieldErrors.dob}
            onChange={(v) => {
              form.setDob(v);
              clearError('dob');
            }}
          />
          <StackedInput label={t('nationalId')} value={form.nationalId} onChange={form.setNationalId} />
          <StackedSelect
            full
            label={t('gender')}
            value={form.gender}
            onChange={form.setGender}
            options={GENDER_OPTIONS}
            placeholder={t('selectPlaceholder')}
          />
        </div>
      </Stack>
    </Section>
  );
}

export function UserRoleStatusFields({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Section icon={RiBriefcaseLine} title={t('sectionRoleStatus')}>
      <Stack gap={5}>
        <div className="ohs-detail-grid">
          <StackedSelect
            full
            label={t('columnRole')}
            value={form.role}
            onChange={form.setRole}
            options={PRACTITIONER_ROLE_CODES}
            placeholder={t('selectPlaceholder')}
          />
        </div>
        <RadioRow
          label={t('columnStatus')}
          name="status"
          value={form.statusActive}
          onChange={(v) => form.setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
          options={[
            { value: 'active', label: t('statusActive') },
            { value: 'inactive', label: t('statusInactive') },
          ]}
        />
      </Stack>
    </Section>
  );
}

export function UserOrganizationFields({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Section icon={RiBuildingLine} title={t('sectionPrimaryOrg')}>
      <MultiSelect
        label={t('contextOrganization')}
        options={form.orgOptions}
        value={form.orgs}
        onChange={form.setOrgs}
        placeholder={form.orgOptions.length > 0 ? t('selectPlaceholder') : t('assignmentsNeedData')}
      />
    </Section>
  );
}

export function UserLocationFields({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Section icon={RiMapPinLine} title={t('sectionLocation')}>
      <MultiSelect
        label={t('contextLocation')}
        options={form.locOptions}
        value={form.locations}
        onChange={form.setLocations}
        placeholder={form.locOptions.length > 0 ? t('selectPlaceholder') : t('assignmentsNeedData')}
      />
    </Section>
  );
}

export function UserCareTeamFields({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Section icon={RiTeamLine} title={t('sectionCareTeams')}>
      <MultiSelect
        label={t('sectionCareTeams')}
        options={form.careTeamOptions}
        value={form.careTeamIds}
        onChange={form.setCareTeamIds}
        placeholder={form.careTeamOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
      />
    </Section>
  );
}

/** Wizard step bodies — same fields without collapsible Section wrappers. */
export function UserBasicInfoStep({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();
  const { fieldErrors, clearError } = form;

  return (
    <Stack gap={5}>
      <div className="ohs-detail-grid">
        <StackedInput
          label={t('givenName')}
          required
          value={form.given}
          error={fieldErrors.givenName}
          onChange={(v) => {
            form.setGiven(v);
            clearError('givenName');
          }}
        />
        <StackedInput
          label={t('familyName')}
          required
          value={form.family}
          error={fieldErrors.familyName}
          onChange={(v) => {
            form.setFamily(v);
            clearError('familyName');
          }}
        />
        <StackedInput
          label={t('emailAddress')}
          type="email"
          required
          value={form.email}
          error={fieldErrors.email}
          onChange={(v) => {
            form.setEmail(v);
            clearError('email');
          }}
        />
        <StackedInput
          label={t('phoneNumber')}
          value={form.phone}
          error={fieldErrors.phone}
          onChange={(v) => {
            form.setPhone(v);
            clearError('phone');
          }}
        />
        <StackedInput
          label={t('dateOfBirth')}
          type="date"
          value={form.dob}
          error={fieldErrors.dob}
          onChange={(v) => {
            form.setDob(v);
            clearError('dob');
          }}
        />
        <StackedInput label={t('nationalId')} value={form.nationalId} onChange={form.setNationalId} />
        <StackedSelect
          full
          label={t('gender')}
          value={form.gender}
          onChange={form.setGender}
          options={GENDER_OPTIONS}
          placeholder={t('selectPlaceholder')}
        />
      </div>
    </Stack>
  );
}

export function UserRoleStatusStep({ form }: Readonly<{ form: Form }>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={5}>
      <div className="ohs-detail-grid">
        <StackedSelect
          full
          label={t('columnRole')}
          value={form.role}
          onChange={form.setRole}
          options={PRACTITIONER_ROLE_CODES}
          placeholder={t('selectPlaceholder')}
        />
      </div>
      <RadioRow
        label={t('columnStatus')}
        name="wizard-status"
        value={form.statusActive}
        onChange={(v) => form.setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
        options={[
          { value: 'active', label: t('statusActive') },
          { value: 'inactive', label: t('statusInactive') },
        ]}
      />
    </Stack>
  );
}
