import { useMemo, useState } from 'react';
import { RiBriefcaseLine, RiUserLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES, PRACTITIONER_ROLE_SYSTEM } from '../../../config/roles';
import { Button, Stack } from '../../../components/ui';
import { validateUserForm, type UserFormErrors } from '../../users/userFormSchema';
import { MultiSelect, RadioRow, Section, StackedInput, StackedSelect } from '../../users/userFormControls';
import type { Option } from '../../users/userFormOptions';
import { DraftList, StepIntro } from '../DraftList';
import { draftResourceName, type DraftCareTeam, type DraftLocation, type DraftOrganization, type DraftUser } from '../types';

export function UsersStep({
  users,
  organizations,
  locations,
  careTeams,
  onChange,
}: Readonly<{
  users: DraftUser[];
  organizations: DraftOrganization[];
  locations: DraftLocation[];
  careTeams: DraftCareTeam[];
  onChange: (next: DraftUser[]) => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [given, setGiven] = useState('');
  const [family, setFamily] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [role, setRole] = useState('');
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>('active');
  const [orgs, setOrgs] = useState<string[]>([]);
  const [locs, setLocs] = useState<string[]>([]);
  const [careTeamIds, setCareTeamIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});

  const orgOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: o.fullUrl,
        label: draftResourceName(o.resource, o.fullUrl),
      })),
    [organizations],
  );
  const locOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: l.fullUrl,
        label: l.resource.name,
      })),
    [locations],
  );
  const careTeamOptions = useMemo(
    () =>
      careTeams.map((c) => ({
        value: c.fullUrl,
        label: draftResourceName(c.resource, c.fullUrl),
      })),
    [careTeams],
  );

  const clearError = (key: keyof UserFormErrors): void =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const resetForm = (): void => {
    setGiven('');
    setFamily('');
    setEmail('');
    setPhone('');
    setGender('');
    setDob('');
    setNationalId('');
    setRole('');
    setStatusActive('active');
    setOrgs([]);
    setLocs([]);
    setCareTeamIds([]);
    setFieldErrors({});
    setEditingId(null);
  };

  const loadUser = (id: string): void => {
    const user = users.find((u) => u.localId === id);
    if (!user) return;
    setEditingId(id);
    setGiven(user.fields.givenName);
    setFamily(user.fields.familyName);
    setEmail(user.fields.email);
    setPhone(user.fields.phone);
    setGender(user.fields.gender);
    setDob(user.fields.dob);
    setNationalId(user.fields.nationalId);
    setRole(user.fields.role?.code ?? '');
    setStatusActive(user.fields.active ? 'active' : 'inactive');
    setOrgs([...user.fields.organizations]);
    setLocs([...user.fields.locations]);
    setCareTeamIds([...user.careTeamIds]);
    setFieldErrors({});
  };

  const saveUser = (): void => {
    const errors = validateUserForm(
      { givenName: given, familyName: family, email, phone, gender, dob, nationalId },
      t,
      { enforceUsername: true },
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const draft: DraftUser = {
      localId: editingId ?? crypto.randomUUID(),
      fields: {
        givenName: given,
        familyName: family,
        email,
        phone,
        gender,
        dob,
        nationalId,
        active: statusActive === 'active',
        role: role ? { system: PRACTITIONER_ROLE_SYSTEM, code: role } : null,
        organizations: orgs,
        locations: locs,
      },
      careTeamIds,
      status: 'pending',
    };
    if (editingId) {
      onChange(users.map((u) => (u.localId === editingId ? { ...draft, status: u.status, error: u.error, createdPractitionerId: u.createdPractitionerId } : u)));
    } else {
      onChange([...users, draft]);
    }
    resetForm();
  };

  const labelFor = (opts: readonly Option[], value: string): string =>
    opts.find((o) => o.value === value)?.label ?? value;

  return (
    <Stack gap={6}>
      <StepIntro
        text={t('setupUsersIntro')}
        count={users.length}
        countLabel={t('setupCountUsers')}
      />

      <Section icon={RiUserLine} title={t('sectionBasicInfo')}>
        {editingId ? (
          <div className="ohs-setup-form__toolbar">
            <Button type="button" variant="outlined" onClick={resetForm}>
              {t('cancel')}
            </Button>
          </div>
        ) : null}
        <div className="ohs-detail-grid">
          <StackedInput
            label={t('givenName')}
            required
            value={given}
            error={fieldErrors.givenName}
            onChange={(v) => {
              setGiven(v);
              clearError('givenName');
            }}
          />
          <StackedInput
            label={t('familyName')}
            required
            value={family}
            error={fieldErrors.familyName}
            onChange={(v) => {
              setFamily(v);
              clearError('familyName');
            }}
          />
          <StackedInput
            label={t('emailAddress')}
            type="email"
            required
            value={email}
            error={fieldErrors.email}
            onChange={(v) => {
              setEmail(v);
              clearError('email');
            }}
          />
          <StackedInput
            label={t('phoneNumber')}
            value={phone}
            error={fieldErrors.phone}
            onChange={(v) => {
              setPhone(v);
              clearError('phone');
            }}
          />
          <StackedSelect
            label={t('gender')}
            value={gender}
            onChange={setGender}
            options={GENDER_OPTIONS}
            placeholder={t('selectPlaceholder')}
          />
          <StackedInput
            label={t('dateOfBirth')}
            type="date"
            value={dob}
            error={fieldErrors.dob}
            onChange={(v) => {
              setDob(v);
              clearError('dob');
            }}
          />
          <StackedInput label={t('nationalId')} value={nationalId} onChange={setNationalId} />
          <StackedSelect
            label={t('columnRole')}
            value={role}
            onChange={setRole}
            options={PRACTITIONER_ROLE_CODES}
            placeholder={t('selectPlaceholder')}
          />
          <RadioRow
            label={t('columnStatus')}
            name="setup-user-status"
            value={statusActive}
            onChange={(v) => setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
            options={[
              { value: 'inactive', label: t('statusInactive') },
              { value: 'active', label: t('statusActive') },
            ]}
          />
        </div>
      </Section>

      <Section icon={RiBriefcaseLine} title={t('sectionAssignments')}>
        <div className="ohs-detail-grid">
          <MultiSelect
            label={t('contextOrganization')}
            options={orgOptions}
            value={orgs}
            onChange={setOrgs}
            placeholder={orgOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
          <MultiSelect
            label={t('contextLocation')}
            options={locOptions}
            value={locs}
            onChange={setLocs}
            placeholder={locOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
          <MultiSelect
            label={t('sectionCareTeams')}
            options={careTeamOptions}
            value={careTeamIds}
            onChange={setCareTeamIds}
            placeholder={careTeamOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
        </div>
        <div className="ohs-setup-form__actions">
          <Button type="button" onClick={saveUser}>
            {editingId ? t('setupUpdateDraft') : t('setupAddUser')}
          </Button>
        </div>
      </Section>

      <DraftList
        items={users.map((u) => ({
          id: u.localId,
          title: `${u.fields.givenName} ${u.fields.familyName}`.trim(),
          meta: [
            u.fields.email,
            u.fields.role ? labelFor(PRACTITIONER_ROLE_CODES, u.fields.role.code) : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }))}
        emptyTitle={t('setupUsersEmpty')}
        emptyHint={t('setupUsersEmptyHint')}
        selectedId={editingId}
        onSelect={loadUser}
        onRemove={(id) => {
          onChange(users.filter((u) => u.localId !== id));
          if (editingId === id) resetForm();
        }}
      />
    </Stack>
  );
}
