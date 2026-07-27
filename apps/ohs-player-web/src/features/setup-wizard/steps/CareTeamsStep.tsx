import { useMemo, useState } from 'react';
import { IconTeam } from '../../../components/ui/icons';
import { newUrnUuid, useTranslation } from 'ohs-player-web-core';
import { Button, Stack } from '../../../components/ui';
import { careTeamFromForm } from '../../sdc/resourceFromAnswers';
import { RadioRow, Section, StackedInput, StackedSelect, StackedTextArea } from '../../users/userFormControls';
import type { Option } from '../../users/userFormOptions';
import { DraftList, StepIntro } from '../DraftList';
import { draftCareTeamEntry } from '../commitSetupWizard';
import { draftResourceName, type DraftCareTeam, type DraftOrganization } from '../types';

export function CareTeamsStep({
  careTeams,
  organizations,
  onChange,
}: Readonly<{
  careTeams: DraftCareTeam[];
  organizations: DraftOrganization[];
  onChange: (next: DraftCareTeam[]) => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>('active');
  const [organizationId, setOrganizationId] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const orgOptions = useMemo<Option[]>(
    () =>
      organizations.map((o) => ({
        value: o.fullUrl,
        label: draftResourceName(o.resource, o.fullUrl),
      })),
    [organizations],
  );

  const orgLabel = (ref: string): string =>
    orgOptions.find((o) => o.value === ref)?.label ?? ref;

  const resetForm = (): void => {
    setName('');
    setDescription('');
    setStatusActive('active');
    setOrganizationId('');
    setNameError(undefined);
    setEditingId(null);
  };

  const loadTeam = (id: string): void => {
    const ct = careTeams.find((c) => c.fullUrl === id);
    if (!ct) return;
    setEditingId(id);
    setName(draftResourceName(ct.resource));
    const note = ct.resource.note as { text?: string }[] | undefined;
    setDescription(note?.[0]?.text ?? '');
    setStatusActive((ct.resource.status as string) === 'inactive' ? 'inactive' : 'active');
    const orgRef =
      (ct.resource.managingOrganization as { reference?: string }[] | undefined)?.[0]?.reference ??
      '';
    setOrganizationId(orgRef);
    setNameError(undefined);
  };

  const saveTeam = (): void => {
    if (!name.trim()) {
      setNameError(t('careTeamNameRequired'));
      return;
    }
    const fullUrl = editingId ?? newUrnUuid();
    const resource = careTeamFromForm({
      name,
      description,
      status: statusActive,
      memberIds: [],
      organizationId,
    });
    const entry = draftCareTeamEntry(resource, fullUrl);
    if (editingId) {
      onChange(careTeams.map((c) => (c.fullUrl === editingId ? entry : c)));
    } else {
      onChange([...careTeams, entry]);
    }
    resetForm();
  };

  return (
    <Stack gap={6}>
      <StepIntro
        text={t('setupCareTeamsIntro')}
        count={careTeams.length}
        countLabel={t('setupCountCareTeams')}
      />

      <Section icon={IconTeam} title={editingId ? t('editCareTeam') : t('addCareTeam')}>
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
            label={t('careTeamName')}
            value={name}
            error={nameError}
            onChange={(v) => {
              setName(v);
              if (nameError) setNameError(undefined);
            }}
          />
          <RadioRow
            label={t('columnStatus')}
            name="setup-careteam-status"
            value={statusActive}
            onChange={(v) => setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
            options={[
              { value: 'inactive', label: t('statusInactive') },
              { value: 'active', label: t('statusActive') },
            ]}
          />
          <StackedTextArea
            full
            label={t('careTeamDescription')}
            value={description}
            onChange={setDescription}
          />
          <StackedSelect
            full
            label={t('organizationForTeam')}
            value={organizationId}
            onChange={setOrganizationId}
            options={orgOptions}
            placeholder={orgOptions.length > 0 ? t('selectPlaceholder') : t('setupNeedOrganizationsFirst')}
          />
        </div>
        <div className="ohs-setup-form__actions">
          <Button type="button" onClick={saveTeam} disabled={orgOptions.length === 0 && !editingId}>
            {editingId ? t('setupUpdateDraft') : t('setupAddCareTeam')}
          </Button>
        </div>
      </Section>

      <DraftList
        items={careTeams.map((ct) => {
          const orgRef =
            (ct.resource.managingOrganization as { reference?: string }[] | undefined)?.[0]
              ?.reference ?? '';
          return {
            id: ct.fullUrl,
            title: draftResourceName(ct.resource),
            meta: orgRef ? orgLabel(orgRef) : t('detailNone'),
          };
        })}
        emptyTitle={t('setupCareTeamsEmpty')}
        emptyHint={t('setupCareTeamsEmptyHint')}
        selectedId={editingId}
        onSelect={loadTeam}
        onRemove={(id) => {
          onChange(careTeams.filter((c) => c.fullUrl !== id));
          if (editingId === id) resetForm();
        }}
      />
    </Stack>
  );
}
