import { type AuditAction, FhirError } from 'ohs-player-web-core';
import {
  describeError,
  type ErrorDescription,
  errorDetail,
  type StatusTone,
} from 'ohs-player-web-shell';

const ACTION_LABEL_KEY: Record<AuditAction, string> = {
  C: 'activityCreated',
  R: 'activityViewed',
  U: 'activityUpdated',
  D: 'activityDeleted',
};

// A portal `D` is a deactivation, not a failure, so it does not use the error tone.
const ACTION_TONE: Record<AuditAction, StatusTone> = {
  C: 'success',
  R: 'neutral',
  U: 'info',
  D: 'warning',
};

const ACCESS_DENIED = new Set([401, 403]);

export function actionLabelKey(action: AuditAction | undefined): string {
  return action ? ACTION_LABEL_KEY[action] : 'activityChanged';
}

export function actionTone(action: AuditAction | undefined): StatusTone {
  return action ? ACTION_TONE[action] : 'neutral';
}

export function auditError(error: unknown, t: (key: string) => string): ErrorDescription {
  if (error instanceof FhirError && ACCESS_DENIED.has(error.status)) {
    return {
      title: t('auditErrorTitle'),
      description: t('auditErrorForbidden'),
      detail: errorDetail(error),
    };
  }
  return describeError(error, t, { titleKey: 'auditErrorTitle' });
}

export function recordedDate(recorded: string | undefined): Date | undefined {
  if (!recorded) return undefined;
  const date = new Date(recorded);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
