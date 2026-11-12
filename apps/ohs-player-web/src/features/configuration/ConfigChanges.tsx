import { useTranslation } from 'ohs-player-web-core';
import { EmptyState, IconArrowRight, StatusBadge, type StatusTone } from 'ohs-player-web-shell';
import { GUARDED_FIELDS, type ChangeKind, type DocumentChange } from './documentDiff';

const KIND_TONE: Record<ChangeKind, StatusTone> = {
  added: 'success',
  removed: 'warning',
  changed: 'info',
};

const KIND_LABEL_KEY: Record<ChangeKind, string> = {
  added: 'configChangeAdded',
  removed: 'configChangeRemoved',
  changed: 'configChangeChanged',
};

function formatValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function ChangeValues({ change }: Readonly<{ change: DocumentChange }>) {
  const { t } = useTranslation();
  return (
    <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-text-muted">
      {change.kind === 'added' ? null : (
        <span>
          <span className="ohs-visually-hidden">{t('configChangeBefore')}</span>
          <code className="font-mono break-all">{formatValue(change.before)}</code>
        </span>
      )}
      {change.kind === 'changed' ? (
        <span aria-hidden="true" className="inline-flex">
          <IconArrowRight size={16} />
        </span>
      ) : null}
      {change.kind === 'removed' ? null : (
        <span>
          <span className="ohs-visually-hidden">{t('configChangeAfter')}</span>
          <code className="font-mono break-all text-text">{formatValue(change.after)}</code>
        </span>
      )}
    </p>
  );
}

function ChangeRow({ change }: Readonly<{ change: DocumentChange }>) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={KIND_TONE[change.kind]}>{t(KIND_LABEL_KEY[change.kind])}</StatusBadge>
        <code className="font-mono text-sm text-text">{change.path}</code>
        {GUARDED_FIELDS.includes(change.field) ? (
          <StatusBadge tone="warning">{t('configGuardedChange')}</StatusBadge>
        ) : null}
      </div>
      <ChangeValues change={change} />
    </li>
  );
}

interface ConfigChangesProps {
  changes: readonly DocumentChange[];
  comparable: boolean;
}

export function ConfigChanges({ changes, comparable }: Readonly<ConfigChangesProps>) {
  const { t } = useTranslation();
  if (!comparable) return <EmptyState title={t('configChangesUnavailable')} />;
  if (changes.length === 0) {
    return (
      <EmptyState title={t('configNoChanges')} description={t('configNoChangesDescription')} />
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {changes.map((change) => (
        <ChangeRow key={`${change.kind}:${change.path}`} change={change} />
      ))}
    </ul>
  );
}
