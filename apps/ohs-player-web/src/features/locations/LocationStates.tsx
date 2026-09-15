import { IconMapPin, IconWarning } from '../../components/ui/icons';
import { useTranslation } from 'ohs-player-web-core';
import { Button, EmptyState, ErrorState, Inline } from '../../components/ui';
import type { HierarchyError } from './useLocationHierarchy';

export function HierarchySkeleton(): React.ReactElement {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <div className="flex flex-col gap-2 p-4" aria-hidden="true">
      {rows.map((i) => (
        <div
          key={i}
          className="h-5 animate-pulse rounded bg-surface-variant"
          style={{ marginLeft: `${(i % 3) * 20}px`, width: `${60 - (i % 3) * 8}%` }}
        />
      ))}
    </div>
  );
}

export function HierarchyEmpty({ onImport }: Readonly<{ onImport?: () => void }>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<IconMapPin size={28} />}
      title={t('locationsEmptyTitle')}
      description={t('locationsEmptyDescription')}
      action={
        onImport ? (
          <Button type="button" onClick={onImport}>
            {t('locationsImport')}
          </Button>
        ) : null
      }
    />
  );
}

export function HierarchyErrorState({
  error,
  onRetry,
}: Readonly<{ error: HierarchyError; onRetry: () => void }>): React.ReactElement {
  const { t } = useTranslation();
  const detail = error.message;
  return (
    <ErrorState
      icon={<IconWarning size={28} />}
      title={t('locationsErrorTitle')}
      description={detail || t('locationsErrorDescription')}
      action={
        <Inline justify="start">
          <Button variant="outlined" type="button" disabled>
            {t('locationsViewStatus')}
          </Button>
          <Button type="button" onClick={onRetry}>
            {t('retry')}
          </Button>
        </Inline>
      }
    />
  );
}

export function TruncatedNotice({
  nodeCount,
  builtAtLabel,
}: Readonly<{ nodeCount: number; builtAtLabel: string }>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="rounded border px-4 py-3 text-sm bg-[var(--ohs-color-level-subcounty-bg)] border-[var(--ohs-color-level-subcounty-border)] text-[var(--ohs-color-level-subcounty-text)]"
    >
      {t('locationsTruncatedNotice', { count: nodeCount, builtAt: builtAtLabel })}
    </div>
  );
}
