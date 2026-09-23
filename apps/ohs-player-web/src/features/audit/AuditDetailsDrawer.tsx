import { useId } from 'react';
import type { AuditEvent, AuditEventAgent, Coding } from '@medplum/fhirtypes';
import {
  activityItemFromAuditEvent,
  FhirJsonView,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import { DetailField, Drawer, IconButton, IconClose, StatusBadge } from 'ohs-player-web-shell';
import { actionLabelKey, actionTone, recordedDate } from './auditPresentation';

const OUTCOME_KEY: Record<string, string> = {
  '0': 'auditOutcomeSuccess',
  '4': 'auditOutcomeMinorFailure',
  '8': 'auditOutcomeSeriousFailure',
  '12': 'auditOutcomeMajorFailure',
};

interface AuditDetailsDrawerProps {
  event: AuditEvent;
  onClose: () => void;
}

function codingText(coding: Coding | undefined): string | undefined {
  return coding?.display ?? coding?.code;
}

function requestingAgent(event: AuditEvent): AuditEventAgent | undefined {
  return event.agent?.find((agent) => agent.requestor) ?? event.agent?.[0];
}

export function AuditDetailsDrawer({
  event,
  onClose,
}: Readonly<AuditDetailsDrawerProps>): React.ReactElement {
  const { t, formatDateTime } = useTranslation();
  const status = useStatusBar();
  const rawHeadingId = useId();
  const item = activityItemFromAuditEvent(event);
  const verb = t(actionLabelKey(item.action));
  const reference = item.resourceType ? `${item.resourceType}/${item.resourceId}` : undefined;
  const recorded = recordedDate(event.recorded);
  const agentId = requestingAgent(event)?.who?.identifier?.value;
  const eventType = [codingText(event.type), ...(event.subtype ?? []).map(codingText)]
    .filter(Boolean)
    .join(' · ');
  const outcomeKey = event.outcome ? OUTCOME_KEY[event.outcome] : undefined;

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <div className="ohs-user-drawer__name-row">
          <h2 className="ohs-form-drawer__title">{t('auditDetailsTitle')}</h2>
          <StatusBadge tone={actionTone(item.action)} icon={<span className="ohs-badge__dot" />}>
            {verb}
          </StatusBadge>
        </div>
        {reference ? <span className="ohs-user-drawer__id-chip">{reference}</span> : null}
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={t('auditDetailsTitle')} header={header}>
      <div className="ohs-detail-body">
        <div className="ohs-detail-grid">
          <DetailField label={t('auditDetailsRecorded')}>
            {recorded ? (
              <time dateTime={event.recorded}>{formatDateTime(recorded)}</time>
            ) : (
              event.recorded
            )}
          </DetailField>
          <DetailField label={t('auditDetailsAgent')}>{item.who}</DetailField>
          <DetailField label={t('auditDetailsAction')}>
            {event.action ? t('auditDetailsActionValue', { verb, code: event.action }) : verb}
          </DetailField>
          <DetailField label={t('auditDetailsEntity')}>{reference}</DetailField>
          <DetailField label={t('auditDetailsDescription')}>{item.description}</DetailField>
          <DetailField label={t('auditDetailsType')}>{eventType}</DetailField>
          <DetailField label={t('auditDetailsOutcome')}>
            {outcomeKey ? t(outcomeKey) : event.outcome}
          </DetailField>
          <DetailField label={t('auditDetailsSource')}>
            {event.source?.observer?.display ?? event.source?.observer?.reference}
          </DetailField>
          {agentId ? <DetailField label={t('auditDetailsAgentId')}>{agentId}</DetailField> : null}
        </div>
        <section className="flex flex-col gap-3 min-w-0" aria-labelledby={rawHeadingId}>
          <h3 id={rawHeadingId} className="m-0 text-sm font-medium text-text-muted">
            {t('auditDetailsRaw')}
          </h3>
          <FhirJsonView
            className="min-w-0"
            resource={event}
            copyLabel={t('fhirViewerCopyCode')}
            copiedLabel={t('fhirViewerCopied')}
            onCopy={() => status.notify({ tone: 'success', title: t('fhirViewerCopiedToast') })}
            onCopyError={() => status.notify({ tone: 'error', title: t('fhirViewerCopyFailed') })}
          />
        </section>
      </div>
    </Drawer>
  );
}
