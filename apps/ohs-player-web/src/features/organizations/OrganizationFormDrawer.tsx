import { type FormEvent, useState } from 'react';
import { RiBuildingLine, RiCloseLine, RiMapPinLine } from '@remixicon/react';
import {
  bundleEntry,
  commitBundle,
  committedId,
  newUrnUuid,
  useFhirClient,
  useOptimisticInsert,
  useRefreshResources,
  useTranslation,
  type TransactionBundleEntry,
} from 'ohs-player-web-core';
import { useWriteAudit } from '../audit/useWriteAudit';
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

function emailOf(org: OrgRow | undefined): string {
  return org?.telecom?.find((tc) => tc.system === 'email')?.value ?? '';
}

function typeCodeOf(org: OrgRow | undefined): string {
  return org?.type?.[0]?.coding?.[0]?.code ?? '';
}

/** Add or Edit an Organisation. Pass `org` to edit (prefills + updates); omit it to create.
 * In `mode: 'wizard'`, builds Bundle entries and calls `onEmit` instead of committing. */
export function OrganizationFormDrawer({
  org,
  managedLocations,
  locationOptions,
  onClose,
  onSuccess,
  mode = 'standalone',
  onEmit,
  partOfOptions,
}: Readonly<{
  org?: OrgRow;
  /** Locations this org currently manages (edit), to prefill + diff on save. */
  managedLocations?: ManagedLocation[];
  locationOptions: Option[];
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'standalone' | 'wizard';
  /** Wizard: receive transaction entries + metadata instead of POSTing. */
  onEmit?: (payload: {
    entries: TransactionBundleEntry[];
    orgFullUrl: string;
    resource: Record<string, unknown>;
    managedLocationRefs: string[];
  }) => void;
  /** Optional parent-organisation picker options (`Organization/{id}` or urn). */
  partOfOptions?: Option[];
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const writeAudit = useWriteAudit();
  const refresh = useRefreshResources();
  const insert = useOptimisticInsert();
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
  const [partOf, setPartOf] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locId = (ref: string): string => ref.replace(/^Location\//, '');

  // PATCH entries that set/clear each to-link/to-unlink Location's managingOrganization — no read of the
  // full resource, so no clobber window. `orgRef` is `urn:uuid:` (create) or `Organization/{id}` (edit).
  const locationEntries = (
    orgRef: string,
  ): { entries: TransactionBundleEntry[]; linked: string[]; unlinked: string[] } => {
    const linked = locationIds.filter((ref) => !originalLocationRefs.includes(ref));
    const unlinked = originalLocationRefs.filter((ref) => !locationIds.includes(ref));
    const entries = [...linked, ...unlinked].map((ref) =>
      bundleEntry(
        { method: 'PATCH', url: `Location/${locId(ref)}` },
        locationManagingOrgPatch(linked.includes(ref) ? orgRef : null),
      ),
    );
    return { entries, linked, unlinked };
  };

  // Commit the Organization (POST on create / PUT on edit) and all Location link/unlink writes in ONE
  // transaction Bundle — atomic, no partial state. Returns the org id + the Locations touched (for audit).
  const commit = async (
    fields: OrgFormFields,
  ): Promise<{ id: string; linked: string[]; unlinked: string[] }> => {
    // On create the org has no id yet, so a urn:uuid: placeholder lets the Location PATCHes reference it
    // within the same Bundle; the server resolves it on commit.
    const orgRef = editing && org?.id ? `Organization/${org.id}` : newUrnUuid();
    const orgEntry: TransactionBundleEntry =
      editing && org?.id
        ? bundleEntry({ method: 'PUT', url: `Organization/${org.id}` }, organizationFromForm(fields, org))
        : bundleEntry({ method: 'POST', url: 'Organization' }, organizationFromForm(fields), orgRef);

    const { entries, linked, unlinked } = locationEntries(orgRef);
    const result = await commitBundle(client, [orgEntry, ...entries]);

    if (editing && org?.id) return { id: org.id, linked, unlinked };
    const id = committedId(result, 0);
    if (!id) throw new Error('Create did not return an id');
    return { id, linked, unlinked };
  };

  const submit = (): void => {
    setError(null);
    if (!name.trim()) {
      setNameError(t('organizationNameRequired'));
      return;
    }
    const fields: OrgFormFields = {
      name,
      typeCode,
      email,
      active: statusActive === 'active',
      ...(partOfOptions ? { partOfReference: partOf } : {}),
    };
    void (async () => {
      setSubmitting(true);
      try {
        if (mode === 'wizard' && onEmit) {
          const orgRef = editing && org?.id ? `Organization/${org.id}` : newUrnUuid();
          const orgEntry: TransactionBundleEntry =
            editing && org?.id
              ? bundleEntry({ method: 'PUT', url: `Organization/${org.id}` }, organizationFromForm(fields, org))
              : bundleEntry({ method: 'POST', url: 'Organization' }, organizationFromForm(fields), orgRef);
          const { entries } = locationEntries(orgRef);
          onEmit({
            entries: [orgEntry, ...entries],
            orgFullUrl: orgRef,
            resource: organizationFromForm(fields, org),
            managedLocationRefs: locationIds,
          });
          onSuccess();
          return;
        }
        const { id, linked, unlinked } = await commit(fields);
        const orgRef = `Organization/${id}`;
        await writeAudit({
          action: editing ? 'update' : 'create',
          resourceType: 'Organization',
          resourceId: id,
        });
        for (const ref of linked) {
          await writeAudit({ action: 'update', resourceType: 'Location', resourceId: locId(ref), description: `Linked to ${orgRef}` });
        }
        for (const ref of unlinked) {
          await writeAudit({ action: 'update', resourceType: 'Location', resourceId: locId(ref), description: `Unlinked from ${orgRef}` });
        }
        // Create: show the new row immediately; the optimistic insert reconciles (org + linked locations)
        // in the background without the refetch wiping it. Edit: the row exists, so just refresh.
        if (editing) await refresh(['Organization', 'Location']);
        else insert('Organization', { ...organizationFromForm(fields), id }, { also: ['Location'] });
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
            {partOfOptions ? (
              <StackedSelect
                full
                label={t('setupPartOfOrganization')}
                value={partOf}
                onChange={setPartOf}
                options={[{ value: '', label: t('detailNone') }, ...partOfOptions]}
                placeholder={t('selectPlaceholder')}
              />
            ) : null}
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
