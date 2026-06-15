import { type FormEvent, useState } from 'react';
import { RiBuildingLine, RiCloseLine, RiMapPinLine } from '@remixicon/react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  useFhirClient,
  useRefreshResources,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import {
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

const ORG_IDENTIFIER_SYSTEM = 'urn:ohs:reference:organization-identifier';

function identifierValueOf(org: OrgRow | undefined): string {
  return (
    org?.identifier?.find((i) => i.system === ORG_IDENTIFIER_SYSTEM)?.value ??
    org?.identifier?.[0]?.value ??
    ''
  );
}

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
  const refresh = useRefreshResources();
  const editing = Boolean(org?.id);

  const [name, setName] = useState(org?.name ?? '');
  const [typeCode, setTypeCode] = useState(typeCodeOf(org));
  const [idMode, setIdMode] = useState<'auto' | 'manual'>(identifierValueOf(org) ? 'manual' : 'auto');
  const [identifierValue, setIdentifierValue] = useState(identifierValueOf(org));
  const [email, setEmail] = useState(emailOf(org));
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>(
    org?.active === false ? 'inactive' : 'active',
  );
  const [locationIds, setLocationIds] = useState<string[]>(locationIdsOf(affiliation));
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = (): void => {
    setError(null);
    if (!name.trim()) {
      setNameError(t('organizationNameRequired'));
      return;
    }
    const fields = {
      name,
      typeCode,
      identifierValue: idMode === 'manual' ? identifierValue : '',
      email,
      active: statusActive === 'active',
    };
    void (async () => {
      setSubmitting(true);
      try {
        let resourceId = org?.id;
        if (editing && org?.id) {
          const body = organizationFromForm(fields, org);
          await client.update('Organization', org.id, body);
          const affBody = organizationAffiliationFromForm(
            `Organization/${org.id}`,
            locationIds,
            affiliation ?? undefined,
          );
          if (affBody) {
            if (affiliation?.id) await client.update('OrganizationAffiliation', affiliation.id, affBody);
            else await client.create(affBody);
          }
        } else {
          const orgRef = 'urn:uuid:org-1';
          const affBody = organizationAffiliationFromForm(orgRef, locationIds);
          const bundle = {
            resourceType: 'Bundle',
            type: 'transaction',
            entry: [
              {
                fullUrl: orgRef,
                resource: organizationFromForm(fields),
                request: { method: 'POST', url: 'Organization' },
              },
              ...(affBody
                ? [{ resource: affBody, request: { method: 'POST', url: 'OrganizationAffiliation' } }]
                : []),
            ],
          };
          const result = (await client.transaction(bundle)) as {
            entry?: { response?: { location?: string } }[];
          };
          resourceId = result.entry?.[0]?.response?.location?.split('/')[1];
        }
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
      <Button type="button" onClick={submit} loading={submitting} disabled={submitting} style={{ flex: 1 }}>
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
      <form className="ohs-detail-body" onSubmit={onFormSubmit}>
        <button type="submit" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
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
              label={t('identifierLabel')}
              name="org-id-mode"
              value={idMode}
              onChange={(v) => setIdMode(v === 'manual' ? 'manual' : 'auto')}
              options={[
                { value: 'auto', label: t('identifierAutogenerated') },
                { value: 'manual', label: t('identifierManual') },
              ]}
            />
            {idMode === 'manual' ? (
              <StackedInput
                full
                label={t('columnIdentifier')}
                value={identifierValue}
                onChange={setIdentifierValue}
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
