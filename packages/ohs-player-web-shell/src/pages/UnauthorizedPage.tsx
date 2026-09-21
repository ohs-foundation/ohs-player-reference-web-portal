import { useTranslation } from 'ohs-player-web-core';
import { Button, Page, PageHeader, Stack } from '../components/ui';
import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page>
      <Stack gap={4}>
        <PageHeader title={t('pageUnauthorized')} description={t('pageUnauthorizedDescription')} />
        <Button
          type="button"
          onClick={() => {
            void navigate('/');
          }}
        >
          {t('goToDashboard')}
        </Button>
      </Stack>
    </Page>
  );
}
