import { type FormEvent, useState } from 'react';
import { RiBuildingLine, RiCloseLine, RiMapPinLine } from '@remixicon/react';
import {
  useFhirClient,
  useRefreshResources,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import {
  type OrgFormFields,
  locationManagingOrgPatch,
  organizationFromForm,
} from '../sdc/resourceFromAnswers';
import { toErrorMessage } from '../sdc/toErrorMessage';
import { ORGANIZATION_TYPE_OPTIONS } from '../../config/organizations';
import { MultiSelect, RadioRow, Section, StackedInput, StackedSelect } from '../users/userFormControls';
import type { Option } from '../users/userFormOptions';
import type { ManagedLocation, OrgRow } from './OrganizationDetailsDrawer';

const FORM_ID = 'organization-form';
const ORG_FULL_URL = 'urn:uuid:org-1';

function emailOf(org: OrgRow | undefined): string {
  return org?.telecom?.find((tc) => tc.system === 'email')?.value ?? '';
}

function typeCodeOf(org: OrgRow | undefined): string {
  return org?.type?.[0]?.coding?.[0]?.code ?? '';
}

/** Add or Edit an Organisation. Pass `org` to edit (prefills + updates); omit it to create. */
export function OrganizationFormDrawer({
  org,
  managedLocations,
  locationOptions,
  onClose,
  onSuccess,
}: Readonly<{
  org?: OrgRow;
  /** Locations this org currently manages (edit), to prefill + diff on save. */
  managedLocations?: ManagedLocation[];
  locationOptions: Option[];
  onClose: () => void;
  onSuccess: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const refresh = useRefreshResources();
  const editing = Boolean(org?.id);

  // The MultiSelect stores `Location/{id}` refs; the org's currently-managed locations seed the edit form.
  const originalLocationRefs = (managedLocations ?? []).map((l) => `Location/${l.id}`);
  const [name, setName] = useState(org?.name ?? '');
  const [typeCode, setTypeCode] = useState(typeCodeOf(org));
  const [email, setEmail] = useState(emailOf(org));
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>(
    org?.active === false ? 'inactive' : 'active',
  );
  const [locationIds, setLocationIds] = useState<string[]>(originalLocationRefs);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locId = (ref: string): string => ref.replace(/^Location\//, '');

  type Entry = { fullUrl?: string; resource: Record<string, unknown>; request: { method: string; url: string } };

  // PATCH entries that set/clear each to-link/to-unlink Location's managingOrganization — no read of the
  // full resource, so no clobber window. `orgRef` is `urn:uuid:` (create) or `Organization/{id}` (edit).
  const locationEntries = (orgRef: string): { entries: Entry[]; linked: string[]; unlinked: string[] } => {
    const linked = locationIds.filter((ref) => !originalLocationRefs.includes(ref));
    const unlinked = originalLocationRefs.filter((ref) => !locationIds.includes(ref));
    const entries = [...linked, ...unlinked].map((ref) => ({
      resource: locationManagingOrgPatch(linked.includes(ref) ? orgRef : null),
      request: { method: 'PATCH', url: `Location/${locId(ref)}` },
    }));
    return { entries, linked, unlinked };
  };

  // Commit the Organization (POST on create / PUT on edit) and all Location link/unlink writes in ONE
  // transaction Bundle — atomic, no partial state. Returns the org id + the Locations touched (for audit).
  const commit = async (
    fields: OrgFormFields,
  ): Promise<{ id: string; linked: string[]; unlinked: string[] }> => {
    const orgRef = editing && org?.id ? `Organization/${org.id}` : ORG_FULL_URL;
    const orgEntry: Entry =
      editing && org?.id
        ? { resource: organizationFromForm(fields, org), request: { method: 'PUT', url: `Organization/${org.id}` } }
        : { fullUrl: orgRef, resource: organizationFromForm(fields), request: { method: 'POST', url: 'Organization' } };

    const { entries, linked, unlinked } = locationEntries(orgRef);
    const bundle = { resourceType: 'Bundle', type: 'transaction', entry: [orgEntry, ...entries] };
    const result = (await client.transaction(bundle)) as { entry?: { response?: { location?: string } }[] };

    if (editing && org?.id) return { id: org.id, linked, unlinked };
    const location = result.entry?.[0]?.response?.location ?? '';
    const id = /Organization\/([^/]+)/.exec(location)?.[1];
    if (!id) throw new Error('Create did not return an id');
    return { id, linked, unlinked };
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
        const { id, linked, unlinked } = await commit(fields);
        const orgRef = `Organization/${id}`;
        await writeAuditEvent(client, {
          action: editing ? 'update' : 'create',
          resourceType: 'Organization',
          resourceId: id,
        });
        for (const ref of linked) {
          await writeAuditEvent(client, { action: 'update', resourceType: 'Location', resourceId: locId(ref), description: `Linked to ${orgRef}` });
        }
        for (const ref of unlinked) {
          await writeAuditEvent(client, { action: 'update', resourceType: 'Location', resourceId: locId(ref), description: `Unlinked from ${orgRef}` });
        }
        await refresh(['Organization', 'Location']);
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

        <Section icon={RiMapPinLine} title={t('sectionManagedLocations')}>
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
