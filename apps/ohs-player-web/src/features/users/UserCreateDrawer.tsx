import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  RiBriefcaseLine,
  RiBuildingLine,
  RiCloseLine,
  RiGroupLine,
  RiMapPinLine,
  RiTeamLine,
  RiUserLine,
} from '@remixicon/react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  useCustomEndpoint,
  useFhirClient,
  useSearch,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES, PRACTITIONER_ROLE_SYSTEM } from '../../config/roles';
import { buildNewUserBundle, buildNewUserPayload, type NewUserFields } from '../sdc/resourceFromAnswers';
import {
  ImageUpload,
  MultiSelect,
  RadioRow,
  Section,
  StackedInput,
  StackedSelect,
} from './userFormControls';
import { type Option, referenceOptions } from './userFormOptions';
import { type UserFormErrors, validateUserForm } from './userFormSchema';

interface SearchBundle {
  entry?: { resource?: { id?: string; name?: string } }[];
  total?: number;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome);
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Map the gateway `GET /api/groups` payload (IamGroupRepresentation[]) to multiselect options. */
function toGroupOptions(data: unknown): Option[] {
  return (Array.isArray(data) ? (data as { id?: string; name?: string; path?: string }[]) : [])
    .filter((g) => typeof g.id === 'string')
    .map((g) => ({ value: g.id as string, label: g.name ?? g.path ?? (g.id as string) }));
}

export function UserCreateDrawer({
  onClose,
  onSuccess,
}: Readonly<{ onClose: () => void; onSuccess: () => void }>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const { post } = useCustomEndpoint('users');

  const orgSearch = useSearch('Organization', { _count: '200', active: 'true' });
  const locSearch = useSearch('Location', { _count: '500' });
  const careTeamSearch = useSearch('CareTeam', { _count: '200' });

  const orgOptions = useMemo(() => referenceOptions(orgSearch.data, 'Organization'), [orgSearch.data]);
  const locOptions = useMemo(() => referenceOptions(locSearch.data, 'Location'), [locSearch.data]);
  const careTeamOptions = useMemo<Option[]>(
    () =>
      ((careTeamSearch.data as SearchBundle | undefined)?.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is { id?: string; name?: string } => Boolean(r?.id))
        .map((r) => ({ value: r.id ?? '', label: r.name ?? r.id ?? '' })),
    [careTeamSearch.data],
  );
  const careTeamById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const e of (careTeamSearch.data as { entry?: { resource?: Record<string, unknown> }[] } | undefined)
      ?.entry ?? []) {
      const r = e.resource;
      const cid = typeof r?.id === 'string' ? r.id : '';
      if (r && cid) map.set(cid, r);
    }
    return map;
  }, [careTeamSearch.data]);

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
  const [locations, setLocations] = useState<string[]>([]);
  const [careTeamIds, setCareTeamIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // IAM groups come from the gateway (not FHIR); load once. Failure is non-fatal — groups stay empty.
  useEffect(() => {
    let active = true;
    void client
      .customGet('groups')
      .then((data) => active && setGroupOptions(toGroupOptions(data)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [client]);

  const clearError = (key: keyof UserFormErrors) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const onFormSubmit = (e: FormEvent): void => {
    e.preventDefault();
    submit();
  };

  const submit = (): void => {
    setError(null);
    const errors = validateUserForm(
      {
        givenName: given,
        familyName: family,
        email,
        phone,
        gender,
        dob,
        nationalId,
      },
      t,
      { enforceUsername: true },
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const fields: NewUserFields = {
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
      locations,
      groupIds,
    };

    void (async () => {
      setSubmitting(true);
      try {
        const created = (await post.mutateAsync(buildNewUserPayload(fields))) as Record<string, unknown>;
        const createdId = typeof created.id === 'string' ? created.id : '';
        if (createdId) {
          const selectedCareTeams = careTeamIds
            .map((cid) => careTeamById.get(cid))
            .filter((r): r is Record<string, unknown> => Boolean(r));
          const bundle = buildNewUserBundle(created, fields, selectedCareTeams);
          if (bundle.entry.length > 0) await client.transaction(bundle);
        }
        const kcId = (created.identifier as { value?: string }[] | undefined)?.find((i) => i.value)?.value;
        await writeAuditEvent(client, {
          action: 'create',
          resourceType: 'Practitioner',
          resourceId: createdId || undefined,
          description: kcId ? `User created via backend (Keycloak ${kcId})` : 'User created via backend',
        });
        onSuccess();
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('addUser')}</h2>
        <p className="ohs-form-drawer__subtitle">{t('addUserSubtitle')}</p>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={onClose} disabled={submitting}>
        {t('cancel')}
      </Button>
      <Button type="button" onClick={submit} loading={submitting} disabled={submitting}>
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('addUser')} header={header} footer={footer}>
      <form className="ohs-detail-body" onSubmit={onFormSubmit}>
        <button type="submit" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
        {error ? <ErrorState description={error} /> : null}

        <Section icon={RiUserLine} title={t('sectionBasicInfo')}>
          <Stack gap={5}>
            <ImageUpload />
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
              <StackedInput
                label={t('nationalId')}
                value={nationalId}
                onChange={setNationalId}
              />
              <StackedSelect
                full
                label={t('gender')}
                value={gender}
                onChange={setGender}
                options={GENDER_OPTIONS}
                placeholder={t('selectPlaceholder')}
              />
            </div>
          </Stack>
        </Section>

        <Section icon={RiBriefcaseLine} title={t('sectionRoleStatus')}>
          <Stack gap={5}>
            <div className="ohs-detail-grid">
              <StackedSelect
                full
                label={t('columnRole')}
                value={role}
                onChange={setRole}
                options={PRACTITIONER_ROLE_CODES}
                placeholder={t('selectPlaceholder')}
              />
            </div>
            <RadioRow
              label={t('columnStatus')}
              name="status"
              value={statusActive}
              onChange={(v) => setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
              options={[
                { value: 'active', label: t('statusActive') },
                { value: 'inactive', label: t('statusInactive') },
              ]}
            />
          </Stack>
        </Section>

        <Section icon={RiBuildingLine} title={t('sectionPrimaryOrg')}>
          <MultiSelect
            label={t('contextOrganization')}
            options={orgOptions}
            value={orgs}
            onChange={setOrgs}
            placeholder={orgOptions.length > 0 ? t('selectPlaceholder') : t('assignmentsNeedData')}
          />
        </Section>

        <Section icon={RiMapPinLine} title={t('sectionLocation')}>
          <MultiSelect
            label={t('contextLocation')}
            options={locOptions}
            value={locations}
            onChange={setLocations}
            placeholder={locOptions.length > 0 ? t('selectPlaceholder') : t('assignmentsNeedData')}
          />
        </Section>

        <Section icon={RiTeamLine} title={t('sectionCareTeams')}>
          <MultiSelect
            label={t('sectionCareTeams')}
            options={careTeamOptions}
            value={careTeamIds}
            onChange={setCareTeamIds}
            placeholder={careTeamOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
        </Section>

        <Section icon={RiGroupLine} title={t('sectionGroups')}>
          <MultiSelect
            label={t('groupsLabel')}
            options={groupOptions}
            value={groupIds}
            onChange={setGroupIds}
            placeholder={groupOptions.length > 0 ? t('selectPlaceholder') : t('groupsEmpty')}
          />
        </Section>
      </form>
    </Drawer>
  );
}
