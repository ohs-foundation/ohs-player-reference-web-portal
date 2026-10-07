import { useTranslation } from 'ohs-player-web-core';
import type { ReactNode, Ref } from 'react';
import { Button } from '../../components/ui';
import { IconAdd } from '../../components/ui/icons';

export interface DashboardEditBarProps {
  addRef?: Ref<HTMLButtonElement>;
  onAdd: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}

/** The actions of configure mode, kept in view while the user scrolls the dashboard. */
export function DashboardEditBar({
  addRef,
  onAdd,
  onReset,
  onCancel,
  onSave,
}: Readonly<DashboardEditBarProps>): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="ohs-dash-editbar" role="group" aria-label={t('dashboardConfigure')}>
      <Button
        ref={addRef}
        variant="secondary"
        size="sm"
        iconLeft={<IconAdd size={20} />}
        onClick={onAdd}
      >
        {t('dashboardAddWidget')}
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset}>
        {t('dashboardReset')}
      </Button>
      <span className="ohs-dash-editbar__spacer" />
      <Button variant="outlined" size="sm" onClick={onCancel}>
        {t('cancel')}
      </Button>
      <Button size="sm" onClick={onSave}>
        {t('save')}
      </Button>
    </div>
  );
}
