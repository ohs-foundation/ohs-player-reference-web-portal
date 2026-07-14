import { useState } from 'react';
import { RiArrowRightLine, RiCloseLine, RiGuideLine, RiFlashlightLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { Button, Drawer, IconButton } from '../../components/ui';
import { UserCreateDrawer } from './UserCreateDrawer';
import { UserCreateWizard } from './UserCreateWizard';

type CreateMode = 'choose' | 'quick' | 'wizard';

export function UserCreateEntryDrawer({
  onClose,
  onSuccess,
}: Readonly<{
  onClose: () => void;
  onSuccess: (created?: { id?: string } & Record<string, unknown>) => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const [mode, setMode] = useState<CreateMode>('choose');

  if (mode === 'quick') {
    return (
      <UserCreateDrawer onClose={onClose} onSuccess={onSuccess} onBack={() => setMode('choose')} />
    );
  }

  if (mode === 'wizard') {
    return (
      <UserCreateWizard onClose={onClose} onSuccess={onSuccess} onBack={() => setMode('choose')} />
    );
  }

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('addUser')}</h2>
        <p className="ohs-form-drawer__subtitle">{t('addUserModeSubtitle')}</p>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={onClose}>
        {t('cancel')}
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('addUser')} header={header} footer={footer}>
      <div className="ohs-detail-body ohs-create-mode">
        <button
          type="button"
          className="ohs-create-mode__option"
          onClick={() => setMode('quick')}
        >
          <span className="ohs-create-mode__icon" aria-hidden="true">
            <RiFlashlightLine size={24} />
          </span>
          <span className="ohs-create-mode__text">
            <span className="ohs-create-mode__title">{t('addUserQuickTitle')}</span>
            <span className="ohs-create-mode__desc">{t('addUserQuickDescription')}</span>
          </span>
          <RiArrowRightLine size={20} className="ohs-create-mode__arrow" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="ohs-create-mode__option"
          onClick={() => setMode('wizard')}
        >
          <span className="ohs-create-mode__icon" aria-hidden="true">
            <RiGuideLine size={24} />
          </span>
          <span className="ohs-create-mode__text">
            <span className="ohs-create-mode__title">{t('addUserWizardTitle')}</span>
            <span className="ohs-create-mode__desc">{t('addUserWizardDescription')}</span>
          </span>
          <RiArrowRightLine size={20} className="ohs-create-mode__arrow" aria-hidden="true" />
        </button>
      </div>
    </Drawer>
  );
}
