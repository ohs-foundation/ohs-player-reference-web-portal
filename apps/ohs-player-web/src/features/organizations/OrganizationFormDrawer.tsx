import { type FormEvent, useState } from 'react';
import { RiBuildingLine, RiCloseLine, RiMapPinLine } from '@remixicon/react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  useCreateResource,
  useFhirClient,
  useRefreshResources,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import {
  type OrgFormFields,
  organizationAffiliationFromForm,
  organizationFromForm,
} from '../sdc/resourceFromAnswers';
import { ORGANIZATION_TYPE_OPTIONS } from '../../config/organizations';
import { MultiSelect, RadioRow, Section, StackedInput, StackedSelect } from '../users/userFormControls';
import type { Option } from '../users/userFormOptions';
import type { OrgRow } from './OrganizationDetailsDrawer';

function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome);
  if (error instanceof Error) return error.message;
  return String(error);
}

const FORM_ID = 'organization-form';

function emailOf(org: OrgRow | undefined): string {
  return org?.telecom?.find((tc) => tc.system === 'email')?.value ?? '';
}

function typeCodeOf(org: OrgRow | undefined): string {
  return org?.type?.[0]?.coding?.[0]?.code ?? '';
}

function locationIdsOf(affiliation: OrgRow['affiliation']): string[] {
  return (affiliation?.location ?? [])
    .map((l) => l.reference ?? '')
    .filter(Boolean);
}

/** Add or Edit an Organisation. Pass `org` to edit (prefills + updates); omit it to create. */
export function OrganizationFormDrawer({
  org,
  affiliation,
  locationOptions,
  onClose,
  onSuccess,
}: Readonly<{
  org?: OrgRow;
  /** Existing OrganizationAffiliation for this org (edit), to prefill + preserve its id. */
  affiliation?: OrgRow['affiliation'];
  locationOptions: Option[];
  onClose: () => void;
  onSuccess: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const createOrg = useCreateResource('Organization');
  const refresh = useRefreshResources();
  const editing = Boolean(org?.id);

  const [name, setName] = useState(org?.name ?? '');
  const [typeCode, setTypeCode] = useState(typeCodeOf(org));
  const [email, setEmail] = useState(emailOf(org));
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>(
    org?.active === false ? 'inactive' : 'active',
  );
  const [locationIds, setLocationIds] = useState<string[]>(locationIdsOf(affiliation));
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const saveEdit = async (fields: OrgFormFields, id: string): Promise<string> => {
    await client.update('Organization', id, organizationFromForm(fields, org));
    // Clearing all locations returns a deactivated body (active:false, location:[]) so the stale link
    // is retired; null only when there were no locations and no existing affiliation to clean up.
    const affBody = organizationAffiliationFromForm(`Organization/${id}`, locationIds, affiliation ?? undefined);
    if (affBody) {
      if (affiliation?.id) await client.update('OrganizationAffiliation', affiliation.id, affBody);
      else await client.create(affBody);
    }
    return id;
  };

  // No affiliation → a plain create returns the org directly; with locations, the affiliation
  // references the org by URN, so both must commit in one transaction.
  const createNew = async (fields: OrgFormFields): Promise<string | undefined> => {
    if (locationIds.length === 0) {
      return ((await createOrg.mutateAsync(organizationFromForm(fields))) as { id?: string }).id;
    }
    const orgRef = 'urn:uuid:org-1';
    const affBody = organizationAffiliationFromForm(orgRef, locationIds);
    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        { fullUrl: orgRef, resource: organizationFromForm(fields), request: { method: 'POST', url: 'Organization' } },
        ...(affBody ? [{ resource: affBody, request: { method: 'POST', url: 'OrganizationAffiliation' } }] : []),
      ],
    };
    const result = (await client.transaction(bundle)) as { entry?: { response?: { location?: string } }[] };
    // `location` may be relative (`Organization/1000/_history/1`) or absolute — match the id either way.
    const location = result.entry?.[0]?.response?.location ?? '';
    return /Organization\/([^/]+)/.exec(location)?.[1];
  };

  const submit = (): void => {
    setError(null);
    if (!name.trim()) {
      setNameError(t('organizationNameRequired'));
      return;
    }
    const fields: OrgFormFields = { name, typeCode, email, active: statusActive === 'active' };
    void (async () => {
      setSubmitting(true);
      try {
        const resourceId = editing && org?.id ? await saveEdit(fields, org.id) : await createNew(fields);
        if (!resourceId) throw new Error('Save did not return an id');
        await writeAuditEvent(client, {
          action: editing ? 'update' : 'create',
          resourceType: 'Organization',
          resourceId,
        });
        await refresh(['Organization', 'OrganizationAffiliation']);
        onSuccess();
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const onFormSubmit = (e: FormEvent): void => {
    e.preventDefault();
    submit();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{editing ? t('editOrganization') : t('addOrganization')}</h2>
        <p className="ohs-form-drawer__subtitle">
          {editing ? t('editOrganizationSubtitle') : t('addOrganizationSubtitle')}
        </p>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={onClose} disabled={submitting} style={{ flex: 1 }}>
        {t('cancel')}
      </Button>
      <Button type="submit" form={FORM_ID} loading={submitting} disabled={submitting} style={{ flex: 1 }}>
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? t('editOrganization') : t('addOrganization')}
      header={header}
      footer={footer}
    >
      <form id={FORM_ID} className="ohs-detail-body" onSubmit={onFormSubmit}>
        {error ? <ErrorState description={error} /> : null}

        <Section icon={RiBuildingLine} title={t('sectionBasicInfo')}>
          <Stack gap={5}>
            <StackedInput
              full
              required
              label={t('organizationName')}
              value={name}
              error={nameError}
              onChange={(v) => {
                setName(v);
                if (nameError) setNameError(undefined);
              }}
            />
            <StackedSelect
              full
              label={t('organizationType')}
              value={typeCode}
              onChange={setTypeCode}
              options={ORGANIZATION_TYPE_OPTIONS}
              placeholder={t('selectPlaceholder')}
            />
            <StackedInput
              full
              type="email"
              label={t('emailAddress')}
              value={email}
              onChange={setEmail}
            />
            <RadioRow
              label={t('columnStatus')}
              name="org-status"
              value={statusActive}
              onChange={(v) => setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
              options={[
                { value: 'inactive', label: t('statusInactive') },
                { value: 'active', label: t('statusActive') },
              ]}
            />
          </Stack>
        </Section>

        <Section icon={RiMapPinLine} title={t('sectionOrgAffiliation')}>
          <MultiSelect
            label={t('contextLocation')}
            options={locationOptions}
            value={locationIds}
            onChange={setLocationIds}
            placeholder={locationOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
        </Section>
      </form>
    </Drawer>
  );
}
