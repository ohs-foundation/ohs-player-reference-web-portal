import { type FormEvent, useMemo, useState } from 'react';
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
  useCustomEndpoint,
  useFhirClient,
  useSearch,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import { GENDER_OPTIONS, PRACTITIONER_ROLE_CODES, PRACTITIONER_ROLE_SYSTEM } from '../../config/roles';
import {
  buildNewUserBundle,
  buildNewUserPayload,
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
  const practCount = useSearch('Practitioner', { _summary: 'count' });

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

  const total = (practCount.data as SearchBundle | undefined)?.total ?? 0;
  const autoIdentifier = `PRAC-${String(total + 1).padStart(3, '0')}`;

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
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key: keyof UserFormErrors) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const manualIdentifier =
    idValue.trim().length > 0 ? { system: PRACTITIONER_IDENTIFIER_SYSTEM, value: idValue.trim() } : null;

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
        qualification,
        identifierMode: idMode,
        identifierValue: idValue,
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
      qualification,
      identifier:
        idMode === 'manual'
          ? manualIdentifier
          : { system: PRACTITIONER_IDENTIFIER_SYSTEM, value: autoIdentifier },
      active: statusActive === 'active',
      role: role ? { system: PRACTITIONER_ROLE_SYSTEM, code: role } : null,
      organizations: orgs,
      locations,
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
          await client.transaction(buildNewUserBundle(created, fields, selectedCareTeams));
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
                { value: 'auto', label: t('identifierAuto') },
                { value: 'manual', label: t('identifierManual') },
              ]}
            />
            {idMode === 'manual' ? (
              <StackedInput
                full
                required
                label={t('columnIdentifier')}
                value={idValue}
                error={fieldErrors.identifierValue}
                placeholder={autoIdentifier}
                onChange={(v) => {
                  setIdValue(v);
                  clearError('identifierValue');
                }}
              />
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
              <StackedInput label={t('qualification')} value={qualification} onChange={setQualification} />
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
      </form>
    </Drawer>
  );
}
