import { useState, type FormEvent } from 'react';
import { FhirError, useStatusBar, useTranslation } from 'ohs-player-web-core';
import {
  Button,
  describeError,
  errorDetail,
  ErrorState,
  IconMagic,
  Inline,
  TextAreaField,
  type ErrorDescription,
} from 'ohs-player-web-shell';
import { ConfigSection } from './ConfigSection';
import { diffDocuments, guardedChanges } from './documentDiff';
import {
  MAX_ASSIST_REQUEST_LENGTH,
  NotAConfigDocumentError,
  type ConfigAssist,
} from './useConfigAssist';
import type { ConfigDraft } from './useConfigDraft';

type Translate = (key: string, values?: Record<string, string | number>) => string;

type AssistOutcome =
  | { kind: 'placed'; summary?: string }
  | { kind: 'guarded'; paths: string[] }
  | { kind: 'failed'; failure: ErrorDescription };

const NOT_SET_UP_STATUSES = new Set([404, 503]);

function assistFailure(error: unknown, t: Translate): ErrorDescription {
  if (error instanceof NotAConfigDocumentError) {
    return {
      title: t('configAssistFailedTitle'),
      description: t('configAssistNotADocument'),
      detail: '',
    };
  }
  if (error instanceof FhirError && NOT_SET_UP_STATUSES.has(error.status)) {
    return {
      title: t('configAssistUnavailableTitle'),
      description: t('configAssistUnavailable'),
      detail: errorDetail(error),
    };
  }
  return describeError(error, t, { titleKey: 'configAssistFailedTitle' });
}

function OutcomeView({ outcome }: Readonly<{ outcome?: AssistOutcome }>) {
  const { t } = useTranslation();
  if (!outcome) return null;
  if (outcome.kind === 'failed') return <ErrorState {...outcome.failure} />;
  if (outcome.kind === 'guarded') {
    return (
      <ErrorState
        title={t('configAssistGuardedTitle')}
        description={t('configAssistGuarded', { paths: outcome.paths.join(', ') })}
      />
    );
  }
  return outcome.summary ? (
    <p className="m-0 text-text">
      <span className="font-semibold">{t('configAssistSummary')}</span> {outcome.summary}
    </p>
  ) : null;
}

interface ConfigAssistPanelProps {
  draft: ConfigDraft;
  assist: ConfigAssist;
}

export function ConfigAssistPanel({ draft, assist }: Readonly<ConfigAssistPanelProps>) {
  const { t } = useTranslation();
  const status = useStatusBar();
  const [request, setRequest] = useState('');
  const [outcome, setOutcome] = useState<AssistOutcome>();
  const sent = draft.parsed.kind === 'valid' ? draft.parsed.document : undefined;
  const canAsk = sent !== undefined && request.trim().length > 0 && !assist.pending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sent || !canAsk) return;
    setOutcome(undefined);
    try {
      const reply = await assist.ask(request.trim(), sent);
      const guarded = guardedChanges(diffDocuments(sent, reply.proposal));
      if (guarded.length > 0) {
        setOutcome({ kind: 'guarded', paths: guarded.map((change) => change.path) });
        return;
      }
      draft.replaceWith(reply.proposal);
      setOutcome({ kind: 'placed', summary: reply.summary });
      status.notify({ tone: 'info', title: t('configAssistPlaced') });
    } catch (error) {
      setOutcome({ kind: 'failed', failure: assistFailure(error, t) });
    }
  };

  return (
    <ConfigSection title={t('configAssistTitle')} description={t('configAssistDisclosure')}>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <TextAreaField
          label={t('configAssistLabel')}
          instructions={t('configAssistInstructions')}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          maxLength={MAX_ASSIST_REQUEST_LENGTH}
          rows={3}
        />
        <Inline>
          <Button
            type="submit"
            disabled={!canAsk}
            loading={assist.pending}
            iconLeft={<IconMagic size={20} />}
          >
            {t('configAssistAsk')}
          </Button>
          {draft.canRestore && !assist.pending ? (
            <Button variant="outlined" onClick={draft.restore}>
              {t('configAssistRestore')}
            </Button>
          ) : null}
        </Inline>
        {sent ? null : (
          <p className="m-0 text-sm text-text-muted">{t('configAssistDraftInvalid')}</p>
        )}
        {assist.pending ? (
          <p role="status" className="m-0 text-text">
            {t('configAssistPending')}
          </p>
        ) : null}
      </form>
      <OutcomeView outcome={outcome} />
    </ConfigSection>
  );
}
