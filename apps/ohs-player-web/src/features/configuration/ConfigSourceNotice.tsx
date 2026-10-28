import { useTranslation } from 'ohs-player-web-core';
import { ErrorDetails, StatusBadge } from 'ohs-player-web-shell';
import type { PortalConfigSource } from '../../config/loadPortalConfig';

const SOURCE_MESSAGE_KEY: Partial<Record<PortalConfigSource, string>> = {
  'last-good': 'configSourceLastGood',
  baked: 'configSourceBaked',
};

export function ConfigSourceNotice({
  source,
  error,
}: Readonly<{ source: PortalConfigSource; error?: string }>) {
  const { t } = useTranslation();
  const messageKey = SOURCE_MESSAGE_KEY[source];
  if (!messageKey) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 flex flex-wrap items-center gap-2 text-text">
        <StatusBadge tone={error ? 'warning' : 'info'}>{t('configSourceLabel')}</StatusBadge>
        {t(messageKey)}
      </p>
      <ErrorDetails>{error}</ErrorDetails>
    </div>
  );
}
