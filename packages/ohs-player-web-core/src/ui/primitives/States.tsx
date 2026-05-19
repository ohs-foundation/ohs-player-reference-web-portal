import { type ReactNode } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

export interface EmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="ohs-empty" role="status">
      <span className="ohs-empty__icon" aria-hidden="true">
        {icon ?? <DefaultEmptyIcon />}
      </span>
      <h3 className="ohs-empty__title">{title ?? t('emptyTitle')}</h3>
      <p className="ohs-empty__description">{description ?? t('emptyDescription')}</p>
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function ErrorState({
  title,
  description,
  action,
  icon,
}: ErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="ohs-error-state" role="alert">
      <span className="ohs-error-state__icon" aria-hidden="true">
        {icon ?? <DefaultErrorIcon />}
      </span>
      <h3 className="ohs-error-state__title">{title ?? t('errorTitle')}</h3>
      <p className="ohs-error-state__description">{description ?? t('errorDescription')}</p>
      {action}
    </div>
  );
}

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  icon?: ReactNode;
}

export function StatusBadge({
  tone = 'neutral',
  icon,
  children,
}: StatusBadgeProps): React.ReactElement {
  return (
    <span className="ohs-badge" data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <md-circular-progress
      indeterminate
      style={{ width: '20px', height: '20px', display: 'inline-block' }}
      role="status"
      aria-label={label ?? t('loading')}
    />
  );
}

export interface LinearProgressProps {
  indeterminate?: boolean;
  value?: number;
  max?: number;
  buffer?: number;
  label?: string;
  style?: React.CSSProperties;
}

export function LinearProgress({
  indeterminate = true,
  value,
  max,
  buffer,
  label,
  style,
}: LinearProgressProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <md-linear-progress
      indeterminate={indeterminate || undefined}
      value={value}
      max={max}
      buffer={buffer}
      role="progressbar"
      aria-label={label ?? t('loading')}
      style={{ width: '100%', ...style }}
    />
  );
}

function DefaultEmptyIcon(): React.ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function DefaultErrorIcon(): React.ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
