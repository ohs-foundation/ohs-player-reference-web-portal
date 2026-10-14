import { useTranslation } from 'ohs-player-web-core';
import { NoticePage } from './NoticePage';

export function UnauthorizedPage() {
  const { t } = useTranslation();
  return <NoticePage title={t('pageUnauthorized')} description={t('pageUnauthorizedDescription')} />;
}
