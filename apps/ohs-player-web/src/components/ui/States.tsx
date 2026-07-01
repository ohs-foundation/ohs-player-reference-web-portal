import { type ReactNode } from 'react';
import * as Progress from '@radix-ui/react-progress';
import { cva } from 'class-variance-authority';
import { useTranslation } from 'ohs-player-web-core';

export interface EmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  /** Larger artwork rendered in place of the small icon circle (e.g. the empty-state illustration). */
  illustration?: ReactNode;
}

export function EmptyState({ title, description, action, icon, illustration }: Readonly<EmptyStateProps>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="ohs-empty" role="status">
      {illustration ? (
        <span className="ohs-empty__illustration" aria-hidden="true">{illustration}</span>
      ) : (
        <span className="ohs-empty__icon" aria-hidden="true">
          {icon ?? <DefaultEmptyIcon />}
        </span>
      )}
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

export function ErrorState({ title, description, action, icon }: Readonly<ErrorStateProps>): React.ReactElement {
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

const badge = cva(
  'inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm/5 font-medium',
  {
    variants: {
      tone: {
        success: 'bg-positive-surface text-positive',
        neutral: 'bg-neutral-surface text-text-muted',
        warning: 'bg-[rgba(224,140,0,0.14)] text-warning',
        error: 'bg-[rgba(179,38,30,0.12)] text-error',
        info: 'bg-primary-container text-primary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function StatusBadge({ tone = 'neutral', icon, children }: Readonly<StatusBadgeProps>): React.ReactElement {
  return (
    <span className={badge({ tone })}>
      {icon}
      {children}
    </span>
  );
}

export function Spinner({ label }: Readonly<{ label?: string }>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <span
      className="ohs-spinner"
      role="status"
      aria-label={label ?? t('loading')}
    />
  );
}

export interface LinearProgressProps {
  indeterminate?: boolean;
  value?: number;
  max?: number;
  label?: string;
  style?: React.CSSProperties;
}

export function LinearProgress({ indeterminate = true, value, max = 100, label, style }: Readonly<LinearProgressProps>): React.ReactElement {
  const { t } = useTranslation();
  const pct = indeterminate ? undefined : Math.round(((value ?? 0) / max) * 100);
  return (
    <Progress.Root
      className="ohs-linear-progress"
      value={pct}
      aria-label={label ?? t('loading')}
      style={{ width: '100%', ...style }}
    >
      <Progress.Indicator
        className={['ohs-linear-progress__bar', indeterminate ? 'ohs-linear-progress__bar--indeterminate' : ''].filter(Boolean).join(' ')}
        style={pct !== undefined ? { transform: `translateX(-${100 - pct}%)` } : undefined}
      />
    </Progress.Root>
  );
}

function DefaultEmptyIcon(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function DefaultErrorIcon(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
