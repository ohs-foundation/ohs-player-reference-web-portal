import { useTranslation } from 'ohs-player-web-core';
import { IconMapPin, Listbox, StatusBadge } from 'ohs-player-web-shell';
import { useAdminScope } from './useAdminScope';

export function ScopeIndicator(): React.ReactElement | null {
  const { t } = useTranslation();
  const { current, districts, setCurrent, loadFailed } = useAdminScope();

  if (loadFailed) return <StatusBadge tone="warning">{t('scopeLoadFailed')}</StatusBadge>;
  if (!current) return null;

  const note = (
    <span className="ohs-visually-hidden">
      {t('scopeConvenienceNote', { district: current.name })}
    </span>
  );

  if (districts.length === 1) {
    return (
      <StatusBadge tone="info" icon={<IconMapPin size={16} />}>
        <span className="ohs-visually-hidden">{t('scopeLabel')}</span>
        {current.name}
        {note}
      </StatusBadge>
    );
  }

  return (
    <div className="w-48 min-w-0 shrink">
      <Listbox
        compact
        label={t('scopeLabel')}
        placeholder={t('scopeChoose')}
        value={[current.id]}
        options={districts.map((d) => ({ value: d.id, label: d.name }))}
        onChange={([next]) => {
          if (next) setCurrent(next);
        }}
      />
      {note}
    </div>
  );
}
