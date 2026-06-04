import { useEffect, useMemo, useState } from 'react';
import {
  RiBriefcaseLine,
  RiBuildingLine,
  RiCloseLine,
  RiMapPinLine,
  RiTeamLine,
  RiUserLine,
} from '@remixicon/react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  useFhirClient,
  useResource,
  useSearch,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Spinner, Stack } from '../../components/ui';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES, PRACTITIONER_ROLE_SYSTEM } from '../../config/roles';
import {
  buildUserEditBundle,
  type NewUserFields,
  PRACTITIONER_IDENTIFIER_SYSTEM,
} from '../sdc/resourceFromAnswers';
import {
  ImageUpload,
  MultiSelect,
  RadioRow,
  Section,
  StackedInput,
  StackedSelect,
} from './userFormControls';
import { type Option, referenceOptions } from './userFormOptions';

interface SearchBundle {
  entry?: { resource?: Record<string, unknown> }[];
}
type PractitionerRoleRes = {
  id?: string;
  organization?: { reference?: string };
  location?: { reference?: string }[];
  code?: { coding?: { code?: string }[] }[];
};

function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome);
  if (error instanceof Error) return error.message;
  return String(error);
}

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

  const existingDisplayId = useMemo(
    () =>
      (pract?.identifier as { system?: string; value?: string }[] | undefined)?.find(
        (i) => i.system === PRACTITIONER_IDENTIFIER_SYSTEM,
      ) ?? null,
    [pract],
  );

  const [given, setGiven] = useState('');
  const [family, setFamily] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [idMode, setIdMode] = useState<'auto' | 'manual'>('auto');
  const [idValue, setIdValue] = useState('');
  const [role, setRole] = useState('');
  const [qualification, setQualification] = useState('');
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>('active');
  const [orgs, setOrgs] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [careTeamIds, setCareTeamIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const relationsLoading = roleSearch.isLoading || membershipSearch.isLoading;

  // Populate the form once the practitioner and its relations have loaded.
  useEffect(() => {
    if (hydrated || !pract || relationsLoading) return;
    const name = (pract.name as { family?: string; given?: string[] }[] | undefined)?.[0];
    const telecom = (pract.telecom as { system?: string; value?: string }[] | undefined) ?? [];
    setGiven(name?.given?.join(' ') ?? '');
    setFamily(name?.family ?? '');
    setEmail(telecom.find((c) => c.system === 'email')?.value ?? '');
    setPhone(telecom.find((c) => c.system === 'phone')?.value ?? '');
    setGender(typeof pract.gender === 'string' ? pract.gender : '');
    setQualification(
      (pract.qualification as { code?: { text?: string } }[] | undefined)?.[0]?.code?.text ?? '',
    );
    setStatusActive((pract.active as boolean | undefined) === false ? 'inactive' : 'active');
    setIdValue(existingDisplayId?.value ?? '');
    setIdMode(existingDisplayId?.value ? 'manual' : 'auto');
    setRole(existingRoles[0]?.code?.[0]?.coding?.[0]?.code ?? '');
    setOrgs(unique(existingRoles.map((r) => r.organization?.reference ?? '').filter(Boolean)));
    setLocations(
      unique(existingRoles.flatMap((r) => (r.location ?? []).map((l) => l.reference ?? '')).filter(Boolean)),
    );
    setCareTeamIds(originalCareTeamIds);
    setHydrated(true);
  }, [hydrated, pract, relationsLoading, existingDisplayId, existingRoles, originalCareTeamIds]);

  const submit = (): void => {
    setError(null);
    if (!pract) return;
    if (!given.trim() || !family.trim() || !email.trim()) {
      setError(t('questionnaireRequiredFields'));
      return;
    }
    let identifier: { system: string; value: string } | null = null;
    if (idMode === 'manual') {
      identifier = idValue.trim()
        ? { system: PRACTITIONER_IDENTIFIER_SYSTEM, value: idValue.trim() }
        : null;
    } else if (existingDisplayId?.value) {
      identifier = {
        system: existingDisplayId.system ?? PRACTITIONER_IDENTIFIER_SYSTEM,
        value: existingDisplayId.value,
      };
    }
    const fields: NewUserFields = {
      givenName: given,
      familyName: family,
      email,
      phone,
      gender,
      qualification,
      identifier,
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
        await client.transaction(
          buildUserEditBundle(pract, fields, { existingRoleIds, careTeamAdds, careTeamRemoves }),
        );
        await writeAuditEvent(client, { action: 'update', resourceType: 'Practitioner', resourceId: id });
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
        <h2 className="ohs-form-drawer__title">{t('pageUserEdit')}</h2>
        <p className="ohs-form-drawer__subtitle">{t('editUserSubtitle')}</p>
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
      <Button type="button" onClick={submit} loading={submitting} disabled={submitting || !pract}>
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('pageUserEdit')} header={header} footer={footer}>
      {read.isLoading || relationsLoading || !hydrated ? (
        <div style={{ padding: 'var(--ohs-spacing-6, 32px)' }}>
          {read.error ? <ErrorState description={toErrorMessage(read.error)} /> : <Spinner label={t('loading')} />}
        </div>
      ) : (
        <div className="ohs-detail-body">
          {error ? <ErrorState description={error} /> : null}

          <Section icon={RiUserLine} title={t('sectionBasicInfo')}>
            <Stack gap={5}>
              <ImageUpload />
              <div className="ohs-detail-grid">
                <StackedInput label={t('givenName')} value={given} onChange={setGiven} />
                <StackedInput label={t('familyName')} value={family} onChange={setFamily} />
                <StackedInput label={t('emailAddress')} type="email" value={email} onChange={setEmail} />
                <StackedInput label={t('phoneNumber')} value={phone} onChange={setPhone} />
                <StackedSelect
                  full
                  label={t('gender')}
                  value={gender}
                  onChange={setGender}
                  options={GENDER_OPTIONS}
                  placeholder={t('selectPlaceholder')}
                />
              </div>
              <RadioRow
                label={t('columnIdentifier')}
                name="identifier-mode"
                value={idMode}
                onChange={(v) => setIdMode(v === 'manual' ? 'manual' : 'auto')}
                options={[
                  { value: 'auto', label: t('identifierKeep') },
                  { value: 'manual', label: t('identifierManual') },
                ]}
              />
              {idMode === 'manual' ? (
                <StackedInput full label={t('columnIdentifier')} value={idValue} onChange={setIdValue} />
              ) : null}
            </Stack>
          </Section>

          <Section icon={RiBriefcaseLine} title={t('sectionRoleStatus')}>
            <Stack gap={5}>
              <div className="ohs-detail-grid">
                <StackedSelect
                  label={t('columnRole')}
                  value={role}
                  onChange={setRole}
                  options={PRACTITIONER_ROLE_CODES}
                  placeholder={t('selectPlaceholder')}
                />
                <StackedInput
                  label={t('qualification')}
                  value={qualification}
                  onChange={setQualification}
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
        </div>
      )}
    </Drawer>
  );
}
