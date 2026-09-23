import { useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader } from 'ohs-player-web-shell';

export function AuditPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t('pageAudit')} description={t('pageAuditDescription')} />
    </Page>
  );
}
