import { IconTeam, ErrorState, Spinner } from 'ohs-player-web-shell';
import { PermissionGuard, useTranslation } from 'ohs-player-web-core';
import { MultiSelect, Section } from './userFormControls';
import type { Option } from './userFormOptions';

export function UserGroupPicker({
  options,
  value,
  onChange,
  isLoading,
  error,
  warnOnEmpty = false,
}: Readonly<{
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  isLoading: boolean;
  error: unknown;
  /** Edit only: warn that saving an empty selection removes the user from every group. */
  warnOnEmpty?: boolean;
}>): React.ReactElement {
  const { t } = useTranslation();

  let body: React.ReactElement;
  if (isLoading) {
    body = <Spinner label={t('groupsLoading')} />;
  } else if (error) {
    body = <ErrorState description={t('groupsLoadError')} />;
  } else {
    body = (
      <>
        <MultiSelect
          label={t('groupsLabel')}
          options={options}
          value={value}
          onChange={onChange}
          placeholder={options.length > 0 ? t('selectPlaceholder') : t('groupsNone')}
        />
        {warnOnEmpty && value.length === 0 ? (
          <p role="alert" className="ohs-detail-empty">
            {t('groupsRemoveAllWarning')}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <PermissionGuard permission="users.edit">
      <Section icon={IconTeam} title={t('sectionGroups')}>
        {body}
      </Section>
    </PermissionGuard>
  );
}
