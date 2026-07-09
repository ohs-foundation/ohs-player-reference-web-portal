import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiMore2Fill } from '@remixicon/react';
import {
  OhsDialog,
  OhsDropdownMenu,
  useResource,
  useStatusBar,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import type { Location } from '@medplum/fhirtypes';
import { Button, IconButton, Inline, Stack } from '../../components/ui';
import { useWriteAudit } from '../audit/useWriteAudit';
import { toErrorMessage } from '../sdc/toErrorMessage';

export interface LocationRowMenuProps {
  nodeId: string;
  status: string | null;
  /** Open the detail drawer for this node. */
  onView: (id: string) => void;
  /** Called after a successful deactivate so the page can refetch the hierarchy. */
  onChanged: () => void;
}

export function LocationRowMenu({ nodeId, status, onView, onChanged }: Readonly<LocationRowMenuProps>): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const statusBar = useStatusBar();
  const writeAudit = useWriteAudit();
  const update = useUpdateResource('Location');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lazily read the full Location only when a deactivate is pending (to send a complete, valid resource back).
  const self = useResource('Location', confirmOpen ? nodeId : undefined);
  const alreadyInactive = status === 'inactive';

  const onConfirmDeactivate = (): void => {
    const current = self.data as Location | undefined;
    if (!current) return;
    void (async () => {
      setSaving(true);
      try {
        // Location uses a `status` code (not `active`); deactivation = status:'inactive'.
        await update.mutateAsync({ id: nodeId, body: { ...current, status: 'inactive' } });
        await writeAudit({
          action: 'update',
          resourceType: 'Location',
          resourceId: nodeId,
          description: "Deactivated (status:'inactive')",
        });
        setConfirmOpen(false);
        statusBar.notify({ tone: 'success', title: t('locationDeactivated') });
        onChanged();
      } catch (err) {
        statusBar.notify({ tone: 'error', title: toErrorMessage(err) });
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <>
      <OhsDropdownMenu.Root>
        <OhsDropdownMenu.Trigger asChild>
          <IconButton label={t('rowActions')} onClick={(e) => e.stopPropagation()}>
            <RiMore2Fill size={20} />
          </IconButton>
        </OhsDropdownMenu.Trigger>
        <OhsDropdownMenu.Portal>
          <OhsDropdownMenu.Content className="ohs-dropdown-content" align="end" sideOffset={4}>
            <OhsDropdownMenu.Item className="ohs-dropdown-item" onSelect={() => onView(nodeId)}>
              {t('viewDetails')}
            </OhsDropdownMenu.Item>
            <OhsDropdownMenu.Item
              className="ohs-dropdown-item"
              onSelect={() => {
                void navigate(`/locations/${nodeId}`);
              }}
            >
              {t('locationsEdit')}
            </OhsDropdownMenu.Item>
            {!alreadyInactive ? (
              <OhsDropdownMenu.Item className="ohs-dropdown-item" onSelect={() => setConfirmOpen(true)}>
                {t('locationsDeactivate')}
              </OhsDropdownMenu.Item>
            ) : null}
          </OhsDropdownMenu.Content>
        </OhsDropdownMenu.Portal>
      </OhsDropdownMenu.Root>

      <OhsDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        headline={t('confirmDeactivateLocationTitle')}
        minWidth="min(96vw, 420px)"
      >
        <Stack gap={4}>
          <p style={{ margin: 0, color: 'var(--ohs-color-text-muted)' }}>{t('confirmDeactivateLocationBody')}</p>
          <Inline justify="end" style={{ gap: 'var(--ohs-spacing-3, 12px)' }}>
            <Button variant="outlined" type="button" onClick={() => setConfirmOpen(false)} disabled={saving}>
              {t('locationsCancel')}
            </Button>
            <Button variant="danger" type="button" onClick={onConfirmDeactivate} loading={saving} disabled={saving || !self.data}>
              {t('locationsDeactivate')}
            </Button>
          </Inline>
        </Stack>
      </OhsDialog>
    </>
  );
}
