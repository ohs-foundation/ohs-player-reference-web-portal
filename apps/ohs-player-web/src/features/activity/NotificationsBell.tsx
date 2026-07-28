import { IconNotification } from '../../components/ui/icons';
import { OhsDropdownMenu, useTranslation } from 'ohs-player-web-core';
import { IconButton } from '../../components/ui';
import { ActivityList } from './ActivityList';
import { useRecentActivity } from './useRecentActivity';

/**
 * Top-nav activity feed: the most recent `AuditEvent`s (which we write on every create/update/deactivate),
 * newest first. Read-only — there is no notification backend, so this surfaces the audit trail rather
 * than a fabricated unread/notification system.
 */
export function NotificationsBell(): React.ReactElement {
  const { t } = useTranslation();
  const { items, loading, error } = useRecentActivity();

  return (
    <OhsDropdownMenu.Root>
      <OhsDropdownMenu.Trigger asChild>
        <IconButton label={t('notifications')} className="app-topbar__bell">
          <IconNotification size={24} />
        </IconButton>
      </OhsDropdownMenu.Trigger>
      <OhsDropdownMenu.Portal>
        <OhsDropdownMenu.Content className="ohs-dropdown-content app-activity" sideOffset={6} align="end">
          <p className="app-activity__title">{t('activityTitle')}</p>
          <div className="app-activity__list">
            <ActivityList items={items} loading={loading} error={error} />
          </div>
        </OhsDropdownMenu.Content>
      </OhsDropdownMenu.Portal>
    </OhsDropdownMenu.Root>
  );
}
