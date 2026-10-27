import { useEffect } from 'react';
import { useFlag, useTranslation } from 'ohs-player-web-core';
import {
  Button,
  IconDownload,
  Inline,
  Page,
  PageHeader,
  Stack,
  StatusBadge,
} from 'ohs-player-web-shell';
import { ConfigAssistPanel } from './ConfigAssistPanel';
import { ConfigChanges } from './ConfigChanges';
import { ConfigEditor } from './ConfigEditor';
import { ConfigPreviewPanel } from './ConfigPreviewPanel';
import { ConfigSection } from './ConfigSection';
import { ConfigSourceNotice } from './ConfigSourceNotice';
import { draftObject } from './configDraft';
import { guardedChanges } from './documentDiff';
import { useConfigAssist } from './useConfigAssist';
import { useConfigDownload } from './useConfigDownload';
import { useConfigDraft, type ConfigDraft } from './useConfigDraft';
import { useConfigPreview, type ConfigPreview } from './useConfigPreview';
import { useRunningConfig } from './RunningConfigContext';

const EMPTY_DOCUMENT: Record<string, unknown> = {};

interface DraftActionsProps {
  draft: ConfigDraft;
  preview: ConfigPreview;
  locked: boolean;
  servedIsBroken: boolean;
}

function DraftActions({ draft, preview, locked, servedIsBroken }: Readonly<DraftActionsProps>) {
  const { t } = useTranslation();
  const download = useConfigDownload();
  const { parsed, changes } = draft;
  const ready = parsed.kind === 'valid' && (changes.length > 0 || servedIsBroken);
  return (
    <Inline>
      <Button variant="outlined" disabled={locked} onClick={draft.reset}>
        {t('configReset')}
      </Button>
      <Button
        variant="secondary"
        disabled={parsed.kind !== 'valid'}
        onClick={() => {
          if (parsed.kind === 'valid') preview.start(parsed.document);
        }}
      >
        {t('configPreview')}
      </Button>
      <Button
        disabled={!ready}
        iconLeft={<IconDownload size={20} />}
        onClick={() => {
          if (parsed.kind === 'valid') void download(parsed.document, changes, draft.assisted);
        }}
      >
        {t('configDownload')}
      </Button>
    </Inline>
  );
}

export function ConfigurationPage() {
  const { t } = useTranslation();
  const running = useRunningConfig();
  const draft = useConfigDraft(running.document ?? EMPTY_DOCUMENT);
  const preview = useConfigPreview();
  const assist = useConfigAssist();
  const assistOn = useFlag('configAssist');
  const guarded = guardedChanges(draft.changes);
  const { end: endPreview } = preview;
  const announcement = assist.pending
    ? t('configAssistPending')
    : preview.document
      ? t('configPreviewActive')
      : '';

  useEffect(() => {
    endPreview();
  }, [draft.text, endPreview]);

  return (
    <Page>
      <PageHeader title={t('pageConfiguration')} description={t('pageConfigurationDescription')} />
      <p role="status" className="ohs-visually-hidden">
        {announcement}
      </p>
      <Stack gap={5}>
        <ConfigSourceNotice source={running.source} error={running.error} />
        {assistOn ? <ConfigAssistPanel draft={draft} assist={assist} /> : null}
        <ConfigSection
          title={t('configEditorTitle')}
          description={t('configEditorDescription')}
          actions={
            <DraftActions
              draft={draft}
              preview={preview}
              locked={assist.pending}
              servedIsBroken={running.source === 'last-good'}
            />
          }
        >
          <ConfigEditor draft={draft} readOnly={assist.pending} />
        </ConfigSection>
        {preview.document ? (
          <ConfigPreviewPanel document={preview.document} onEnd={endPreview} />
        ) : null}
        <ConfigSection title={t('configChangesTitle')} description={t('configChangesDescription')}>
          {guarded.length > 0 ? (
            <p className="m-0 flex flex-wrap items-center gap-2 text-text">
              <StatusBadge tone="warning">{t('configGuardedChange')}</StatusBadge>
              {t('configGuardedNotice')}
            </p>
          ) : null}
          <ConfigChanges
            changes={draft.changes}
            comparable={draftObject(draft.parsed) !== undefined}
          />
        </ConfigSection>
      </Stack>
    </Page>
  );
}
