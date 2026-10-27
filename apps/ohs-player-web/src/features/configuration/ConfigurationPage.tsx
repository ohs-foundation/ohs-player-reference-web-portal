import { useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader } from 'ohs-player-web-shell';

export function ConfigurationPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t('pageConfiguration')} description={t('pageConfigurationDescription')} />
    </Page>
  );
}
