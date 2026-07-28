import { useMemo, useState } from 'react';
import { IconBuilding } from '../../../components/ui/icons';
import { newUrnUuid, useTranslation } from 'ohs-player-web-core';
import { Button, Stack } from '../../../components/ui';
import { ORGANIZATION_TYPE_OPTIONS } from '../../../config/organizations';
import { organizationFromForm, type OrgFormFields } from '../../sdc/resourceFromAnswers';
import { MultiSelect, RadioRow, Section, StackedInput, StackedSelect } from '../../users/userFormControls';
import type { Option } from '../../users/userFormOptions';
import { DraftList, StepIntro } from '../DraftList';
import { draftOrganizationEntry } from '../commitSetupWizard';
import { draftResourceName, type DraftLocation, type DraftOrganization } from '../types';

export function OrganizationsStep({
  organizations,
  locations,
  serverLocationOptions,
  serverOrgOptions,
  onChange,
}: Readonly<{
  organizations: DraftOrganization[];
  locations: DraftLocation[];
  serverLocationOptions: Option[];
  serverOrgOptions: Option[];
  onChange: (next: DraftOrganization[]) => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [email, setEmail] = useState('');
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>('active');
  const [partOf, setPartOf] = useState('');
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();

  const locationOptions = useMemo(() => {
    const draftOpts = locations.map((l) => ({
      value: l.fullUrl,
      label: `${l.resource.name} (${t('setupDraftBadge')})`,
    }));
    return [...draftOpts, ...serverLocationOptions];
  }, [locations, serverLocationOptions, t]);

  const partOfOptions = useMemo(() => {
    const none = { value: '', label: t('detailNone') };
    const draftOpts = organizations
      .filter((o) => o.fullUrl !== editingId)
      .map((o) => ({
        value: o.fullUrl,
        label: `${draftResourceName(o.resource, o.fullUrl)} (${t('setupDraftBadge')})`,
      }));
    return [none, ...draftOpts, ...serverOrgOptions];
  }, [organizations, serverOrgOptions, editingId, t]);

  const resetForm = (): void => {
    setName('');
    setTypeCode('');
    setEmail('');
    setStatusActive('active');
    setPartOf('');
    setLocationIds([]);
    setNameError(undefined);
    setEditingId(null);
  };

  const loadOrg = (id: string): void => {
    const org = organizations.find((o) => o.fullUrl === id);
    if (!org) return;
    setEditingId(id);
    setName(draftResourceName(org.resource));
    const type = (org.resource.type as { coding?: { code?: string }[] }[] | undefined)?.[0]
      ?.coding?.[0]?.code;
    setTypeCode(type ?? '');
    const telecom = org.resource.telecom as { system?: string; value?: string }[] | undefined;
    setEmail(telecom?.find((tc) => tc.system === 'email')?.value ?? '');
    setStatusActive(org.resource.active === false ? 'inactive' : 'active');
    const parent = (org.resource.partOf as { reference?: string } | undefined)?.reference ?? '';
    setPartOf(parent);
    setLocationIds([...org.managedLocationRefs]);
    setNameError(undefined);
  };

  const saveOrg = (): void => {
    if (!name.trim()) {
      setNameError(t('organizationNameRequired'));
      return;
    }
    const fields: OrgFormFields = {
      name,
      typeCode,
      email,
      active: statusActive === 'active',
      partOfReference: partOf || '',
    };
    const fullUrl = editingId ?? newUrnUuid();
    const resource = organizationFromForm(fields);
    const entry = draftOrganizationEntry(resource, locationIds, fullUrl);
    if (editingId) {
      onChange(organizations.map((o) => (o.fullUrl === editingId ? entry : o)));
    } else {
      onChange([...organizations, entry]);
    }
    resetForm();
  };

  return (
    <Stack gap={6}>
      <StepIntro
        text={t('setupOrganizationsIntro')}
        count={organizations.length}
        countLabel={t('setupCountOrganizations')}
      />

      <Section icon={IconBuilding} title={editingId ? t('editOrganization') : t('addOrganization')}>
        {editingId ? (
          <div className="ohs-setup-form__toolbar">
            <Button type="button" variant="outlined" onClick={resetForm}>
              {t('cancel')}
            </Button>
          </div>
        ) : null}
        <div className="ohs-detail-grid">
          <StackedInput
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
            label={t('organizationType')}
            value={typeCode}
            onChange={setTypeCode}
            options={ORGANIZATION_TYPE_OPTIONS}
            placeholder={t('selectPlaceholder')}
          />
          <StackedInput type="email" label={t('emailAddress')} value={email} onChange={setEmail} />
          <RadioRow
            label={t('columnStatus')}
            name="setup-org-status"
            value={statusActive}
            onChange={(v) => setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
            options={[
              { value: 'inactive', label: t('statusInactive') },
              { value: 'active', label: t('statusActive') },
            ]}
          />
          <StackedSelect
            label={t('setupPartOfOrganization')}
            value={partOf}
            onChange={setPartOf}
            options={partOfOptions}
            placeholder={t('selectPlaceholder')}
          />
          <MultiSelect
            label={t('contextLocation')}
            options={locationOptions}
            value={locationIds}
            onChange={setLocationIds}
            placeholder={locationOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
        </div>
        <div className="ohs-setup-form__actions">
          <Button type="button" onClick={saveOrg}>
            {editingId ? t('setupUpdateDraft') : t('setupAddOrganization')}
          </Button>
        </div>
      </Section>

      <DraftList
        items={organizations.map((org) => ({
          id: org.fullUrl,
          title: draftResourceName(org.resource),
          meta: t('setupOrgDraftMeta', { count: String(org.managedLocationRefs.length) }),
        }))}
        emptyTitle={t('setupOrganizationsEmpty')}
        emptyHint={t('setupOrganizationsEmptyHint')}
        selectedId={editingId}
        onSelect={loadOrg}
        onRemove={(id) => {
          onChange(organizations.filter((o) => o.fullUrl !== id));
          if (editingId === id) resetForm();
        }}
      />
    </Stack>
  );
}
