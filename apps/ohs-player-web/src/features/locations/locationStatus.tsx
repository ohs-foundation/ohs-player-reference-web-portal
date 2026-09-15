import { useTranslation } from 'ohs-player-web-core';
import { StatusBadge, type StatusTone } from '../../components/ui';

function statusTone(status: string | null | undefined): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    case 'inactive':
      return 'error';
    default:
      return 'neutral';
  }
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'locationStatusActive',
  suspended: 'locationStatusSuspended',
  inactive: 'locationStatusInactive',
};

export function LocationStatusBadge({ status }: Readonly<{ status: string | null | undefined }>): React.ReactElement {
  const { t } = useTranslation();
  const key = status ? STATUS_LABEL_KEYS[status] : undefined;
  const label = key ? t(key) : (status ?? t('detailNone'));
  return (
    <StatusBadge tone={statusTone(status)} icon={<span className="ohs-badge__dot" />}>
      {label}
    </StatusBadge>
  );
}
