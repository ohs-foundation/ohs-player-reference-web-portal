import { useTranslation } from 'ohs-player-web-core';
import { useAdminScope } from './useAdminScope';

export function ScopeNote(): React.ReactElement | null {
  const { t } = useTranslation();
  const { current, incomplete } = useAdminScope();
  if (!current) return null;
  return (
    <p className="m-0 text-sm text-text-muted">
      {t('scopeConvenienceNote', { district: current.name })}
      {incomplete ? ` ${t('scopeIncomplete')}` : null}
    </p>
  );
}
