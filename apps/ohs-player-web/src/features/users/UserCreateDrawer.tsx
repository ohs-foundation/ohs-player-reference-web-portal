import { type FormEvent } from 'react';
import { IconClose } from '../../components/ui/icons';
import { useTranslation } from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton } from '../../components/ui';
import {
  UserBasicInfoFields,
  UserCareTeamFields,
  UserLocationFields,
  UserOrganizationFields,
  UserRoleStatusFields,
} from './UserCreateFormSections';
import { useUserCreateForm } from './useUserCreateForm';

export function UserCreateDrawer({
  onClose,
  onSuccess,
  onBack,
}: Readonly<{
  onClose: () => void;
  /** Receives the created Practitioner (from the gateway 201) for an optimistic list insert. */
  onSuccess: (created?: { id?: string } & Record<string, unknown>) => void;
  /** When set, shows a back control to return to the mode chooser. */
  onBack?: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const form = useUserCreateForm(onSuccess);

  const onFormSubmit = (e: FormEvent): void => {
    e.preventDefault();
    form.submit();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{t('addUserQuickTitle')}</h2>
        <p className="ohs-form-drawer__subtitle">{t('addUserSubtitle')}</p>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      {onBack ? (
        <Button variant="outlined" type="button" onClick={onBack} disabled={form.submitting}>
          {t('back')}
        </Button>
      ) : (
        <Button variant="outlined" type="button" onClick={onClose} disabled={form.submitting}>
          {t('cancel')}
        </Button>
      )}
      <Button
        type="button"
        onClick={form.submit}
        loading={form.submitting}
        disabled={form.submitting}
        style={{ marginLeft: 'auto' }}
      >
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('addUserQuickTitle')} header={header} footer={footer}>
      <form className="ohs-detail-body" onSubmit={onFormSubmit}>
        <button type="submit" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
        {form.error ? <ErrorState description={form.error} /> : null}

        <UserBasicInfoFields form={form} />
        <UserRoleStatusFields form={form} />
        <UserOrganizationFields form={form} />
        <UserLocationFields form={form} />
        <UserCareTeamFields form={form} />
      </form>
    </Drawer>
  );
}
