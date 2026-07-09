import { RiMore2Fill } from '@remixicon/react';
import { OhsDropdownMenu, PermissionGuard, useTranslation } from 'ohs-player-web-core';
import { IconButton } from '../../components/ui';

export interface LocationRowMenuProps {
  nodeId: string;
  /** Open the detail drawer for this node. */
  onView: (id: string) => void;
  /** Open the edit drawer for this node (gated by locations.edit). */
  onEdit: (id: string) => void;
}

// Deactivate was removed: the gateway's hierarchy cache (up to 24 h, no invalidation endpoint) can't
// reflect a status write, so the action appeared to do nothing. Restore once the backend supports it.
export function LocationRowMenu({ nodeId, onView, onEdit }: Readonly<LocationRowMenuProps>): React.ReactElement {
  const { t } = useTranslation();

  return (
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
          <PermissionGuard permission="locations.edit">
            <OhsDropdownMenu.Item className="ohs-dropdown-item" onSelect={() => onEdit(nodeId)}>
              {t('locationsEdit')}
            </OhsDropdownMenu.Item>
          </PermissionGuard>
        </OhsDropdownMenu.Content>
      </OhsDropdownMenu.Portal>
    </OhsDropdownMenu.Root>
  );
}
