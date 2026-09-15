import { useState } from 'react';
import { IconBuilding, IconClose, IconMapPin } from '../../components/ui/icons';
import {
  OhsDialog,
  PermissionGuard,
  useStatusBar,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import { useWriteAudit } from '../audit/useWriteAudit';
import { Button, Drawer, IconButton, Inline, Stack, StatusBadge } from '../../components/ui';
import { Section } from '../users/userFormControls';
import { toErrorMessage } from '../sdc/toErrorMessage';

/** A managed Location (id + display name), resolved by the page from `Location.managingOrganization`. */
export type ManagedLocation = { id: string; name: string };

export type OrgRow = {
  id?: string;
  name?: string;
  active?: boolean;
  type?: { coding?: { code?: string; display?: string }[] }[];
  identifier?: { system?: string; value?: string }[];
  telecom?: { system?: string; value?: string }[];
  /** Locations this org manages (`Location.managingOrganization` → this org), attached by the page. */
  managedLocations?: ManagedLocation[];
};

function Field({ label, value }: Readonly<{ label: string; value?: string }>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{value && value.trim() ? value : '—'}</span>
    </div>
  );
}

export function OrganizationDetailsDrawer({
  org,
  active,
  typeLabel,
  identifierValue,
  email,
  onClose,
  onEdit,
  onChanged,
}: Readonly<{
  org: OrgRow;
  active: boolean;
  typeLabel?: string;
  identifierValue?: string;
  email?: string;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const writeAudit = useWriteAudit();
  const status = useStatusBar();
  const update = useUpdateResource('Organization');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const locations = org.managedLocations ?? [];

  const onConfirmDeactivate = (): void => {
    const id = org.id;
    if (!id) return;
    void (async () => {
      setSaving(true);
      try {
        // `managedLocations` is a UI-only field the page attaches to the row; never send it to the server.
        const body: Record<string, unknown> = { ...org, resourceType: 'Organization', active: false };
        delete body.managedLocations;
        await update.mutateAsync({ id, body });
        await writeAudit({
          action: 'update',
          resourceType: 'Organization',
          resourceId: id,
          description: 'Deactivated (active:false)',
        });
        setConfirmOpen(false);
        status.notify({ tone: 'success', title: t('organizationDeactivated') });
        onChanged();
        onClose();
      } catch (err) {
        status.notify({ tone: 'error', title: toErrorMessage(err) });
      } finally {
        setSaving(false);
      }
    })();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <div className="ohs-user-drawer__name-row">
          <h2 className="ohs-form-drawer__title">{org.name ?? org.id}</h2>
          <StatusBadge tone={active ? 'success' : 'neutral'} icon={<span className="ohs-badge__dot" />}>
            {active ? t('statusActive') : t('statusInactive')}
          </StatusBadge>
        </div>
        {identifierValue ? <span className="ohs-user-drawer__id-chip">{identifierValue}</span> : null}
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <PermissionGuard permission="orgs.create">
        <Button variant="ghost" className="ohs-btn-danger" type="button" onClick={() => setConfirmOpen(true)} disabled={saving}>
          {t('deactivateOrganization')}
        </Button>
      </PermissionGuard>
      <PermissionGuard permission="orgs.create">
        <Button type="button" onClick={onEdit} style={{ marginLeft: 'auto' }}>
          {t('editDetails')}
        </Button>
      </PermissionGuard>
    </div>
  );

  return (
    <>
      <Drawer open onClose={onClose} title={org.name ?? org.id ?? ''} header={header} footer={footer}>
        <div className="ohs-detail-body">
          <Section icon={IconBuilding} title={t('sectionBasicInfo')}>
            <Stack gap={4}>
              <Field label={t('organizationType')} value={typeLabel} />
              <Field label={t('emailAddress')} value={email} />
              <div className="ohs-detail-grid">
                <Field label={t('columnIdentifier')} value={identifierValue} />
                <Field label={t('columnStatus')} value={active ? t('statusActive') : t('statusInactive')} />
              </div>
            </Stack>
          </Section>

          <Section icon={IconMapPin} title={t('sectionManagedLocations')}>
            {locations.length === 0 ? (
              <span style={{ color: 'var(--ohs-color-text-muted, #696969)' }}>{t('detailNone')}</span>
            ) : (
              <Stack gap={3}>
                {locations.map((l) => (
                  <Inline key={l.id} style={{ gap: 'var(--ohs-sys-spacing-2, 8px)', alignItems: 'center' }}>
                    <IconMapPin size={16} aria-hidden="true" />
                    <span>{l.name}</span>
                  </Inline>
                ))}
              </Stack>
            )}
          </Section>
        </div>
      </Drawer>

      <OhsDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        headline={t('confirmDeactivateOrgTitle')}
        minWidth="min(96vw, 420px)"
      >
        <Stack gap={4}>
          <p style={{ margin: 0, color: 'var(--ohs-color-text-muted, #696969)' }}>{t('confirmDeactivateOrgBody')}</p>
          <Inline justify="end" style={{ gap: 'var(--ohs-sys-spacing-3, 12px)' }}>
            <Button variant="outlined" type="button" onClick={() => setConfirmOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button variant="danger" type="button" onClick={onConfirmDeactivate} loading={saving} disabled={saving}>
              {t('deactivate')}
            </Button>
          </Inline>
        </Stack>
      </OhsDialog>
    </>
  );
}
