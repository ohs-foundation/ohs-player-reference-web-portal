import { useTranslation } from 'ohs-player-web-core';
import { Spinner } from '../../components/ui';
import { type ActivityItem } from './useRecentActivity';

const ACTION_KEY: Record<NonNullable<ActivityItem['action']>, string> = {
  C: 'activityCreated',
  R: 'activityViewed',
  U: 'activityUpdated',
  D: 'activityDeleted',
};

/** Relative time like "5m ago" / "2h ago" using the platform Intl API (no date library). */
function relativeTime(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

export interface ActivityListProps {
  items: readonly ActivityItem[];
  loading: boolean;
  error: string | null;
}

/** Presentational activity feed body: one line per AuditEvent (verb + resource, who, relative time). */
export function ActivityList({ items, loading, error }: Readonly<ActivityListProps>): React.ReactElement {
  const { t, locale } = useTranslation();

  if (loading) {
    return (
      <div className="app-activity__status">
        <Spinner label={t('loading')} />
      </div>
    );
  }
  if (error) {
    return <p className="app-activity__status">{error}</p>;
  }
  if (items.length === 0) {
    return <p className="app-activity__status">{t('activityEmpty')}</p>;
  }

  const sentence = (item: ActivityItem): string => {
    const verb = t(item.action ? ACTION_KEY[item.action] : 'activityChanged');
    const subject = item.resourceId ? `${item.resourceType} ${item.resourceId}` : item.resourceType;
    return `${verb} ${subject}`.trim();
  };

  return (
    <>
      {items.map((item) => (
        <div key={item.id} className="app-activity__item">
          <p className="app-activity__text">{sentence(item)}</p>
          <p className="app-activity__meta">
            {[item.who, relativeTime(item.recorded, locale)].filter(Boolean).join(' · ')}
          </p>
          {item.description ? <p className="app-activity__desc">{item.description}</p> : null}
        </div>
      ))}
    </>
  );
}
