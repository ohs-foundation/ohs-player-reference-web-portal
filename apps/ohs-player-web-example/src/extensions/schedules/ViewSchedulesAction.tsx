import {
  FeatureGuard,
  OhsDropdownMenu,
  PermissionGuard,
  useTranslation,
} from 'ohs-player-web-core';
import type { SlotContexts } from 'ohs-player-web-shell';
import { useNavigate } from 'react-router-dom';

export function ViewSchedulesAction({
  context,
}: Readonly<{ context: SlotContexts['users.rowActions'] }>): React.ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = context.practitioner;
  if (!id) return null;

  const actor = encodeURIComponent(`Practitioner/${id}`);
  return (
    <FeatureGuard flag="schedules">
      <PermissionGuard permission="schedules.view" fallback={null}>
        <OhsDropdownMenu.Item
          className="ohs-dropdown-item"
          onSelect={() => void navigate(`/schedules?actor=${actor}`)}
        >
          {t('schedulesViewForUser')}
        </OhsDropdownMenu.Item>
      </PermissionGuard>
    </FeatureGuard>
  );
}
