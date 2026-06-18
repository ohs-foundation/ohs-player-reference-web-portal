import { useState } from 'react';
import { RiCloseLine, RiGroupLine, RiTeamLine } from '@remixicon/react';
import type { CareTeam } from '@medplum/fhirtypes';
import {
  OhsDialog,
  PermissionGuard,
  useFhirClient,
  useStatusBar,
  useTranslation,
  useUpdateResource,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Avatar, Button, Drawer, IconButton, Inline, Stack, StatusBadge } from '../../components/ui';
import { Section } from '../users/userFormControls';

export type CareTeamRow = CareTeam;

function Field({ label, value }: Readonly<{ label: string; value?: string }>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{value && value.trim() ? value : '—'}</span>
    </div>
  );
}

function memberId(ref: string | undefined): string {
  return ref?.replace(/^Practitioner\//, '') ?? '';
}

export function CareTeamDetailsDrawer({
  team,
  active,
  practNameById,
  orgName,
  onClose,
  onEdit,
  onChanged,
}: Readonly<{
  team: CareTeamRow;
  active: boolean;
  practNameById: Map<string, string>;
  orgName?: string;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const status = useStatusBar();
  const update = useUpdateResource('CareTeam');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const members = (team.participant ?? [])
    .map((p) => {
      const id = memberId(p.member?.reference);
      const coding = p.role?.[0]?.coding?.[0];
      return { id, name: practNameById.get(id) ?? id, role: coding?.display ?? coding?.code ?? '' };
    })
    .filter((m) => m.id);

  const description = team.note?.[0]?.text ?? '';

  const onConfirmRetire = (): void => {
    const id = team.id;
    if (!id) return;
    void (async () => {
      setSaving(true);
      try {
        await update.mutateAsync({ id, body: { ...team, resourceType: 'CareTeam', status: 'inactive' } });
        await writeAuditEvent(client, {
          action: 'update',
          resourceType: 'CareTeam',
          resourceId: id,
          description: 'Retired (status:inactive)',
        });
        setConfirmOpen(false);
        status.notify({ tone: 'success', title: t('careTeamRetired') });
        onChanged();
        onClose();
      } catch (err) {
        status.notify({ tone: 'error', title: err instanceof Error ? err.message : t('saveFailed') });
      } finally {
        setSaving(false);
      }
    })();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <div className="ohs-user-drawer__name-row">
          <h2 className="ohs-form-drawer__title">{team.name ?? team.id}</h2>
          <StatusBadge tone={active ? 'success' : 'neutral'} icon={<span className="ohs-badge__dot" />}>
            {active ? t('statusActive') : t('statusInactive')}
          </StatusBadge>
        </div>
        <span className="ohs-user-drawer__id-chip">{team.id}</span>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <PermissionGuard permission="careteams.manage">
        <Button variant="ghost" className="ohs-btn-danger" type="button" onClick={() => setConfirmOpen(true)} disabled={saving}>
          {t('deleteCareTeam')}
        </Button>
      </PermissionGuard>
      <PermissionGuard permission="careteams.manage">
        <Button type="button" onClick={onEdit} style={{ marginLeft: 'auto' }}>
          {t('editDetails')}
        </Button>
      </PermissionGuard>
    </div>
  );

  return (
    <>
      <Drawer open onClose={onClose} title={team.name ?? team.id ?? ''} header={header} footer={footer}>
        <div className="ohs-detail-body">
          <Section icon={RiTeamLine} title={t('sectionBasicInfo')}>
            <Stack gap={4}>
              <Field label={t('descriptionLabel')} value={description} />
              <Field label={t('organizationForTeam')} value={orgName} />
              <div className="ohs-detail-grid">
                <Field label={t('columnIdentifier')} value={team.id} />
                <Field label={t('columnStatus')} value={active ? t('statusActive') : t('statusInactive')} />
              </div>
            </Stack>
          </Section>

          <Section icon={RiGroupLine} title={t('sectionMembers')}>
            {members.length === 0 ? (
              <span style={{ color: 'var(--ohs-color-text-muted, #696969)' }}>{t('detailNone')}</span>
            ) : (
              <div>
                {members.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--ohs-spacing-3, 12px)',
                      padding: 'var(--ohs-spacing-3, 12px) 0',
                      borderBottom: i < members.length - 1 ? '1px solid var(--ohs-color-border, #ededed)' : 'none',
                    }}
                  >
                    <Avatar name={m.name} className="ohs-avatar--sm" />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span>{m.name}</span>
                      {m.role ? (
                        <span style={{ fontSize: 'var(--ohs-font-text-s-size, 12px)', color: 'var(--ohs-color-text-muted, #696969)' }}>
                          {m.role}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </Drawer>

      <OhsDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        headline={t('confirmRetireTitle')}
        minWidth="min(96vw, 420px)"
      >
        <Stack gap={4}>
          <p style={{ margin: 0, color: 'var(--ohs-color-text-muted, #696969)' }}>{t('confirmRetireBody')}</p>
          <Inline justify="end" style={{ gap: 'var(--ohs-spacing-3, 12px)' }}>
            <Button variant="outlined" type="button" onClick={() => setConfirmOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button variant="danger" type="button" onClick={onConfirmRetire} loading={saving} disabled={saving}>
              {t('retire')}
            </Button>
          </Inline>
        </Stack>
      </OhsDialog>
    </>
  );
}
