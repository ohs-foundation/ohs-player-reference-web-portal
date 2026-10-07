import { useTranslation } from 'ohs-player-web-core';
import { StatusBadge, type StatusTone } from 'ohs-player-web-shell';
import { LOCATION_STATUS_LABEL_KEYS } from '../users/userFormOptions';

function statusTone(status: string | null | undefined): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function LocationStatusBadge({ status }: Readonly<{ status: string | null | undefined }>): React.ReactElement {
  const { t } = useTranslation();
  const key = status ? LOCATION_STATUS_LABEL_KEYS[status] : undefined;
  const label = key ? t(key) : (status ?? t('detailNone'));
  return (
    <StatusBadge tone={statusTone(status)} icon={<span className="ohs-badge__dot" />}>
      {label}
    </StatusBadge>
  );
}
