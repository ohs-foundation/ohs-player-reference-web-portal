import { useTranslation } from 'ohs-player-web-core';
import { RecordStatusBadge } from 'ohs-player-web-shell';
import { LOCATION_STATUS_LABEL_KEYS } from '../users/userFormOptions';

export function LocationStatusBadge({ status }: Readonly<{ status: string | null | undefined }>): React.ReactElement {
  const { t } = useTranslation();
  const key = status ? LOCATION_STATUS_LABEL_KEYS[status] : undefined;
  const label = key ? t(key) : (status ?? t('detailNone'));
  return <RecordStatusBadge status={status}>{label}</RecordStatusBadge>;
}
