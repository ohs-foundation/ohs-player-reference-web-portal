import { useFlag, useTranslation } from 'ohs-player-web-core';
import { Button, Page, PageHeader, Stack } from '../components/ui';
import { useNavigate } from 'react-router-dom';

export function NoticePage({
  title,
  description,
}: Readonly<{ title: string; description: string }>): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dashboardOn = useFlag('dashboard');

  return (
    <Page>
      <Stack gap={4}>
        <PageHeader title={title} description={description} />
        {dashboardOn ? (
          <Button
            type="button"
            onClick={() => {
              void navigate('/');
            }}
          >
            {t('goToDashboard')}
          </Button>
        ) : null}
      </Stack>
    </Page>
  );
}
