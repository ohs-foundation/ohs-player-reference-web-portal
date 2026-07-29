import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  IconBriefcase,
  IconBuilding,
  IconClose,
  IconMapPin,
  IconTeam,
  IconUser,
} from '../../components/ui/icons';
import {
  commitBundle,
  useCustomEndpoint,
  useFhirClient,
  useResource,
  useSearch,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import { useWriteAudit } from '../audit/useWriteAudit';
import { Button, Drawer, ErrorState, IconButton, Spinner, Stack } from '../../components/ui';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES, PRACTITIONER_ROLE_SYSTEM } from '../../config/roles';
import {
  buildNewUserPayload,
  buildUserEditBundle,
  NATIONAL_ID_IDENTIFIER_SYSTEM,
  type NewUserFields,
  usernameFromEmail,
} from '../sdc/resourceFromAnswers';
import { toErrorMessage, userErrorMessage } from '../sdc/toErrorMessage';
import {
  MultiSelect,
  RadioRow,
  Section,
  StackedInput,
  StackedSelect,
} from './userFormControls';
import { type Option, referenceOptions } from './userFormOptions';
import { todayIso, type UserFormErrors, validateUserForm } from './userFormSchema';

interface SearchBundle {
  entry?: { resource?: Record<string, unknown> }[];
}
type PractitionerRoleRes = {
  id?: string;
  organization?: { reference?: string };
  location?: { reference?: string }[];
  code?: { coding?: { code?: string }[] }[];
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function resourcesOf(bundle: unknown): Record<string, unknown>[] {
  return ((bundle as SearchBundle | undefined)?.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is Record<string, unknown> => Boolean(r));
}

export function UserEditDrawer({
  id,
  onClose,
  onSuccess,
}: Readonly<{ id: string; onClose: () => void; onSuccess: () => void }>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const writeAudit = useWriteAudit();
  const status = useStatusBar();
  const { put } = useCustomEndpoint('users');

  const read = useResource('Practitioner', id);
  const roleSearch = useSearch('PractitionerRole', { practitioner: `Practitioner/${id}`, _count: '50' });
  const membershipSearch = useSearch('CareTeam', { participant: `Practitioner/${id}`, _count: '100' });
  const orgSearch = useSearch('Organization', { _count: '200', active: 'true' });
  const locSearch = useSearch('Location', { _count: '500' });
  const careTeamSearch = useSearch('CareTeam', { _count: '200' });

  const pract = read.data as Record<string, unknown> | undefined;

  const orgOptions = useMemo(() => referenceOptions(orgSearch.data, 'Organization'), [orgSearch.data]);
  const locOptions = useMemo(() => referenceOptions(locSearch.data, 'Location'), [locSearch.data]);
  const careTeamOptions = useMemo<Option[]>(
    () =>
      resourcesOf(careTeamSearch.data).map((r) => ({
        value: typeof r.id === 'string' ? r.id : '',
        label: typeof r.name === 'string' ? r.name : (r.id as string),
      })),
    [careTeamSearch.data],
  );
  const careTeamById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const r of resourcesOf(careTeamSearch.data)) {
      if (typeof r.id === 'string') map.set(r.id, r);
    }
    return map;
  }, [careTeamSearch.data]);

  const existingRoles = useMemo(
    () => resourcesOf(roleSearch.data) as PractitionerRoleRes[],
    [roleSearch.data],
  );
  const existingRoleIds = useMemo(
    () => existingRoles.map((r) => r.id).filter((x): x is string => Boolean(x)),
    [existingRoles],
  );
  const originalCareTeamIds = useMemo(
    () =>
      resourcesOf(membershipSearch.data)
        .map((r) => (typeof r.id === 'string' ? r.id : ''))
        .filter(Boolean),
    [membershipSearch.data],
  );

  const [given, setGiven] = useState('');
  const [family, setFamily] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [role, setRole] = useState('');
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>('active');
  // Keycloak username can't be read back from FHIR; reproduce create-time derivation from the stored
  // email so an email edit doesn't rename the account.
  const [originalUsername, setOriginalUsername] = useState('');
  const [orgs, setOrgs] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [careTeamIds, setCareTeamIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const clearError = (key: keyof UserFormErrors) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const onFormSubmit = (e: FormEvent): void => {
    e.preventDefault();
    submit();
  };

  const relationsLoading = roleSearch.isLoading || membershipSearch.isLoading;

  // Populate the form once the practitioner and its relations have loaded.
  useEffect(() => {
    if (hydrated || !pract || relationsLoading) return;
    const name = (pract.name as { family?: string; given?: string[] }[] | undefined)?.[0];
    const telecom = (pract.telecom as { system?: string; value?: string }[] | undefined) ?? [];
    const email = telecom.find((c) => c.system === 'email')?.value ?? '';
    const identifiers = (pract.identifier as { system?: string; value?: string }[] | undefined) ?? [];
    setGiven(name?.given?.join(' ') ?? '');
    setFamily(name?.family ?? '');
    setEmail(email);
    setOriginalUsername(usernameFromEmail(email));
    setPhone(telecom.find((c) => c.system === 'phone')?.value ?? '');
    setGender(typeof pract.gender === 'string' ? pract.gender : '');
    setDob(typeof pract.birthDate === 'string' ? pract.birthDate : '');
    setNationalId(identifiers.find((i) => i.system === NATIONAL_ID_IDENTIFIER_SYSTEM)?.value ?? '');
    setStatusActive((pract.active as boolean | undefined) === false ? 'inactive' : 'active');
    setRole(existingRoles[0]?.code?.[0]?.coding?.[0]?.code ?? '');
    setOrgs(unique(existingRoles.map((r) => r.organization?.reference ?? '').filter(Boolean)));
    setLocations(
      unique(existingRoles.flatMap((r) => (r.location ?? []).map((l) => l.reference ?? '')).filter(Boolean)),
    );
    setCareTeamIds(originalCareTeamIds);
    setHydrated(true);
  }, [hydrated, pract, relationsLoading, existingRoles, originalCareTeamIds]);

  const submit = (): void => {
    setError(null);
    if (!pract) return;
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
    };
    const careTeamAdds = careTeamIds
      .filter((cid) => !originalCareTeamIds.includes(cid))
      .map((cid) => careTeamById.get(cid))
      .filter((r): r is Record<string, unknown> => Boolean(r));
    const careTeamRemoves = originalCareTeamIds
      .filter((cid) => !careTeamIds.includes(cid))
      .map((cid) => careTeamById.get(cid))
      .filter((r): r is Record<string, unknown> => Boolean(r));

    void (async () => {
      setSubmitting(true);
      try {
        // Gateway owns the Keycloak user + Practitioner demographics; preserve the username.
        await put.mutateAsync({ id, body: buildNewUserPayload(fields, originalUsername) });
        // FHIR handles only what the gateway doesn't: PractitionerRoles + CareTeam membership.
        const bundle = buildUserEditBundle(id, fields, { existingRoleIds, careTeamAdds, careTeamRemoves });
        if (bundle.entry.length > 0) await commitBundle(client, bundle.entry);
        await writeAudit({ action: 'update', resourceType: 'Practitioner', resourceId: id });
        onSuccess();
      } catch (err) {
        const message = userErrorMessage(err, t, 'userSaveError');
        setError(message);
        status.notify({ tone: 'error', title: message });
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('pageUserEdit')}</h2>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={onClose} disabled={submitting}>
        {t('cancel')}
      </Button>
      <Button type="button" onClick={submit} loading={submitting} disabled={submitting || !pract}>
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('pageUserEdit')} header={header} footer={footer}>
      {read.isLoading || relationsLoading || !hydrated ? (
        <div style={{ padding: 'var(--ohs-sys-spacing-8, 32px)' }}>
          {read.error ? <ErrorState description={toErrorMessage(read.error)} /> : <Spinner label={t('loading')} />}
        </div>
      ) : (
        <form className="ohs-detail-body" onSubmit={onFormSubmit}>
          <button type="submit" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
          {error ? <ErrorState description={error} /> : null}

          <Section icon={IconUser} title={t('sectionBasicInfo')}>
            <Stack gap={5}>
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
                  max={todayIso()}
                  value={dob}
                  error={fieldErrors.dob}
                  onChange={(v) => {
                    setDob(v);
                    clearError('dob');
                  }}
                />
                <StackedInput label={t('nationalId')} value={nationalId} onChange={setNationalId} />
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

          <Section icon={IconBriefcase} title={t('sectionRoleStatus')}>
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

          <Section icon={IconBuilding} title={t('sectionPrimaryOrg')}>
            <MultiSelect
              label={t('contextOrganization')}
              options={orgOptions}
              value={orgs}
              onChange={setOrgs}
              placeholder={orgOptions.length > 0 ? t('selectPlaceholder') : t('assignmentsNeedData')}
            />
          </Section>

          <Section icon={IconMapPin} title={t('sectionLocation')}>
            <MultiSelect
              label={t('contextLocation')}
              options={locOptions}
              value={locations}
              onChange={setLocations}
              placeholder={locOptions.length > 0 ? t('selectPlaceholder') : t('assignmentsNeedData')}
            />
          </Section>

          <Section icon={IconTeam} title={t('sectionCareTeams')}>
            <MultiSelect
              label={t('sectionCareTeams')}
              options={careTeamOptions}
              value={careTeamIds}
              onChange={setCareTeamIds}
              placeholder={careTeamOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
            />
          </Section>
        </form>
      )}
    </Drawer>
  );
}
