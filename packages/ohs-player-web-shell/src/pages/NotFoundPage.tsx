import { useTranslation } from 'ohs-player-web-core';
import { NoticePage } from './NoticePage';

export function NotFoundPage() {
  const { t } = useTranslation();
  return <NoticePage title={t('pageNotFound')} description={t('pageNotFoundDescription')} />;
}
