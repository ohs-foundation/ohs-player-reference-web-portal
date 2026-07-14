import { useMemo, useState } from 'react';
import {
  commitBundle,
  useCustomEndpoint,
  useFhirClient,
  useSearch,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import { PRACTITIONER_ROLE_SYSTEM } from '../../config/roles';
import { useWriteAudit } from '../audit/useWriteAudit';
import { buildNewUserBundle, buildNewUserPayload, type NewUserFields } from '../sdc/resourceFromAnswers';
import { userErrorMessage } from '../sdc/toErrorMessage';
import { type Option, referenceOptions } from './userFormOptions';
import { type UserFormErrors, validateUserForm } from './userFormSchema';

interface SearchBundle {
  entry?: { resource?: { id?: string; name?: string } }[];
}

export interface UserCreateFormState {
  given: string;
  setGiven: (v: string) => void;
  family: string;
  setFamily: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  nationalId: string;
  setNationalId: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  statusActive: 'active' | 'inactive';
  setStatusActive: (v: 'active' | 'inactive') => void;
  orgs: string[];
  setOrgs: (v: string[]) => void;
  locations: string[];
  setLocations: (v: string[]) => void;
  careTeamIds: string[];
  setCareTeamIds: (v: string[]) => void;
  orgOptions: Option[];
  locOptions: Option[];
  careTeamOptions: Option[];
  fieldErrors: UserFormErrors;
  error: string | null;
  submitting: boolean;
  clearError: (key: keyof UserFormErrors) => void;
  validateStep: (step: number) => boolean;
  submit: () => void;
  labelForOption: (options: readonly Option[], value: string) => string;
  labelsForValues: (options: readonly Option[], values: string[]) => string;
}

export function useUserCreateForm(onSuccess: (created?: { id?: string } & Record<string, unknown>) => void): UserCreateFormState {
  const { t } = useTranslation();
  const client = useFhirClient();
  const writeAudit = useWriteAudit();
  const status = useStatusBar();
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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key: keyof UserFormErrors) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const formValues = {
    givenName: given,
    familyName: family,
    email,
    phone,
    gender,
    dob,
    nationalId,
  };

  const validateStep = (step: number): boolean => {
    if (step !== 0) return true;
    const errors = validateUserForm(formValues, t, { enforceUsername: true });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildFields = (): NewUserFields => ({
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
  });

  const submit = (): void => {
    setError(null);
    const errors = validateUserForm(formValues, t, { enforceUsername: true });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const fields = buildFields();

    void (async () => {
      setSubmitting(true);
      try {
        const created = (await post.mutateAsync(buildNewUserPayload(fields))) as Record<string, unknown>;
        const createdId = typeof created.id === 'string' ? created.id : '';

        let assignmentFailed = false;
        if (createdId) {
          const selectedCareTeams = careTeamIds
            .map((cid) => careTeamById.get(cid))
            .filter((r): r is Record<string, unknown> => Boolean(r));
          const bundle = buildNewUserBundle(created, fields, selectedCareTeams);
          if (bundle.entry.length > 0) {
            try {
              await commitBundle(client, bundle.entry);
            } catch {
              assignmentFailed = true;
            }
          }
        }

        const kcId = (created.identifier as { value?: string }[] | undefined)?.find((i) => i.value)?.value;
        await writeAudit({
          action: 'create',
          resourceType: 'Practitioner',
          resourceId: createdId || undefined,
          description: kcId ? `User created via backend (Keycloak ${kcId})` : 'User created via backend',
        });

        if (assignmentFailed) status.notify({ tone: 'warning', title: t('userCreatedAssignmentFailed') });
        onSuccess(created);
      } catch (err) {
        const message = userErrorMessage(err, t, 'userCreateError');
        setError(message);
        status.notify({ tone: 'error', title: message });
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const labelForOption = (options: readonly Option[], value: string): string =>
    options.find((o) => o.value === value)?.label ?? value;

  const labelsForValues = (options: readonly Option[], values: string[]): string =>
    values.length > 0
      ? values.map((v) => labelForOption(options, v)).join(', ')
      : t('detailNone');

  return {
    given,
    setGiven,
    family,
    setFamily,
    email,
    setEmail,
    phone,
    setPhone,
    gender,
    setGender,
    dob,
    setDob,
    nationalId,
    setNationalId,
    role,
    setRole,
    statusActive,
    setStatusActive,
    orgs,
    setOrgs,
    locations,
    setLocations,
    careTeamIds,
    setCareTeamIds,
    orgOptions,
    locOptions,
    careTeamOptions,
    fieldErrors,
    error,
    submitting,
    clearError,
    validateStep,
    submit,
    labelForOption,
    labelsForValues,
  };
}
