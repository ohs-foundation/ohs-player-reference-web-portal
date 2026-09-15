import { IconMore } from '../../components/ui/icons';
import { OhsDropdownMenu, PermissionGuard, useTranslation } from 'ohs-player-web-core';
import { IconButton } from '../../components/ui';

export interface LocationRowMenuProps {
  nodeId: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

// No Deactivate: the hierarchy cache can't reflect a status write; restore when the backend can.
export function LocationRowMenu({ nodeId, onView, onEdit }: Readonly<LocationRowMenuProps>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <OhsDropdownMenu.Root>
      <OhsDropdownMenu.Trigger asChild>
        <IconButton label={t('rowActions')} onClick={(e) => e.stopPropagation()}>
          <IconMore size={20} />
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
