import { Link } from 'react-router-dom';
import { useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader } from 'ohs-player-web-shell';

export function OrganizationsPermissionFallback() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t('pageUnauthorized')} description={t('pageUnauthorizedDescription')} />
      <p>
        <Link to="/">{t('goToDashboard')}</Link>
      </p>
    </Page>
  );
}
