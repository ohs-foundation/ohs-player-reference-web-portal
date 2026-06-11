import { useState } from 'react';
import { RiCloseLine, RiDeleteBinLine } from '@remixicon/react';
import {
  PermissionGuard,
  useFhirClient,
  useStatusBar,
  useTranslation,
  useUpdateResource,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Avatar, Drawer, IconButton, SelectField, Stack, StatusBadge } from '../../components/ui';
import { CARE_TEAM_ROLE_CODING } from '../sdc/resourceFromAnswers';

function Field({ label, value }: Readonly<{ label: string; value?: string }>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{value && value.trim() ? value : '—'}</span>
    </div>
  );
}

export type CareTeamRow = {
  id?: string;
  name?: string;
  status?: string;
  participant?: { member?: { reference?: string }; role?: unknown[] }[];
  managingOrganization?: { reference?: string }[];
};

function memberId(ref: string | undefined): string {
  return ref?.replace(/^Practitioner\//, '') ?? '';
}

export function CareTeamDetailsDrawer({
  team,
  orgName,
  active,
  practOptions,
  practNameById,
  onClose,
  onChanged,
}: Readonly<{
  team: CareTeamRow;
  orgName: string;
  active: boolean;
  practOptions: { value: string; label: string }[];
  practNameById: Map<string, string>;
  onClose: () => void;
  onChanged: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const status = useStatusBar();
  const update = useUpdateResource('CareTeam');
  const [saving, setSaving] = useState(false);

  const participants = team.participant ?? [];
  const memberRefs = participants.map((p) => memberId(p.member?.reference)).filter(Boolean);
  const available = practOptions.filter((o) => !memberRefs.includes(o.value));

  const save = (next: CareTeamRow, description: string): void => {
    const id = team.id;
    if (!id) return;
    void (async () => {
      setSaving(true);
      try {
        await update.mutateAsync({ id, body: next });
        await writeAuditEvent(client, {
          action: 'update',
          resourceType: 'CareTeam',
          resourceId: id,
          description,
        });
        onChanged();
      } catch (err) {
        status.notify({ tone: 'error', title: err instanceof Error ? err.message : t('saveFailed') });
      } finally {
        setSaving(false);
      }
    })();
  };

  const addParticipant = (practId: string): void => {
    save(
      {
        ...team,
        participant: [
          ...participants,
          { member: { reference: `Practitioner/${practId}` }, role: [{ coding: [CARE_TEAM_ROLE_CODING] }] },
        ],
      },
      'Participant added',
    );
  };

  const removeParticipant = (practId: string): void => {
    save(
      { ...team, participant: participants.filter((p) => memberId(p.member?.reference) !== practId) },
      'Participant removed',
    );
  };

  const header = (
    <div className="ohs-user-drawer__head">
      <div className="ohs-user-drawer__identity">
        <Avatar name={team.name ?? team.id ?? ''} className="ohs-avatar--lg" />
        <div>
          <div className="ohs-user-drawer__name-row">
            <h2 className="ohs-user-drawer__name">{team.name ?? team.id}</h2>
            <StatusBadge tone={active ? 'success' : 'neutral'} icon={<span className="ohs-badge__dot" />}>
              {active ? t('statusActive') : t('statusInactive')}
            </StatusBadge>
          </div>
          <span className="ohs-user-drawer__id-chip">{team.id}</span>
        </div>
      </div>
      <IconButton label={t('close')} className="ohs-user-drawer__close" onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={team.name ?? team.id ?? ''} header={header}>
      <div className="ohs-detail-body">
        <Stack gap={4}>
          <div className="ohs-detail-grid">
            <Field label={t('columnOrganisation')} value={orgName} />
            <Field label={t('columnStatus')} value={active ? t('statusActive') : t('statusInactive')} />
          </div>

          <div>
            <span className="ohs-formfield__label">
              {t('participantsLabel')} · {t('membersCount', { count: memberRefs.length })}
            </span>
            <Stack gap={2} style={{ marginTop: 'var(--ohs-spacing-2, 8px)' }}>
              {memberRefs.length === 0 ? (
                <span style={{ color: 'var(--ohs-color-text-muted, #696969)' }}>{t('detailNone')}</span>
              ) : (
                memberRefs.map((mid) => (
                  <div
                    key={mid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--ohs-spacing-3, 12px)',
                      padding: 'var(--ohs-spacing-2, 8px) 0',
                      borderBottom: '1px solid var(--ohs-color-border, #ededed)',
                    }}
                  >
                    <Avatar name={practNameById.get(mid) ?? mid} className="ohs-avatar--sm" />
                    <span style={{ flex: 1, minWidth: 0 }}>{practNameById.get(mid) ?? mid}</span>
                    <PermissionGuard permission="careteams.manage">
                      <IconButton
                        label={t('removeParticipant')}
                        onClick={() => removeParticipant(mid)}
                        disabled={saving}
                      >
                        <RiDeleteBinLine size={20} />
                      </IconButton>
                    </PermissionGuard>
                  </div>
                ))
              )}
            </Stack>
          </div>

          <PermissionGuard permission="careteams.manage">
            <SelectField
              label={t('addPractitioner')}
              name={`add-participant-${team.id}`}
              options={available}
              value=""
              placeholder={t('selectPlaceholder')}
              disabled={saving || available.length === 0}
              onChange={(e) => {
                if (e.target.value) addParticipant(e.target.value);
              }}
            />
          </PermissionGuard>
        </Stack>
      </div>
    </Drawer>
  );
}
