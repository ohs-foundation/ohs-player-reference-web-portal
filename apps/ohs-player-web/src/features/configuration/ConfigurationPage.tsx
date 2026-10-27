import { useTranslation } from 'ohs-player-web-core';
import {
  Button,
  IconDownload,
  Inline,
  Page,
  PageHeader,
  Stack,
  StatusBadge,
} from 'ohs-player-web-shell';
import { ConfigChanges } from './ConfigChanges';
import { ConfigEditor } from './ConfigEditor';
import { ConfigSection } from './ConfigSection';
import { ConfigSourceNotice } from './ConfigSourceNotice';
import { draftObject } from './configDraft';
import { guardedChanges } from './documentDiff';
import { useConfigDownload } from './useConfigDownload';
import { useConfigDraft, type ConfigDraft } from './useConfigDraft';
import { useRunningConfig } from './RunningConfigContext';

const EMPTY_DOCUMENT: Record<string, unknown> = {};

function DraftActions({ draft }: Readonly<{ draft: ConfigDraft }>) {
  const { t } = useTranslation();
  const download = useConfigDownload();
  const { parsed, changes } = draft;
  const ready = parsed.kind === 'valid' && changes.length > 0;
  return (
    <Inline>
      <Button variant="outlined" onClick={draft.reset}>
        {t('configReset')}
      </Button>
      <Button
        disabled={!ready}
        iconLeft={<IconDownload size={20} />}
        onClick={() => {
          if (parsed.kind === 'valid')
            void download(parsed.document, changes, draft.origin === 'proposal');
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
  const guarded = guardedChanges(draft.changes);

  return (
    <Page>
      <PageHeader title={t('pageConfiguration')} description={t('pageConfigurationDescription')} />
      <Stack gap={5}>
        <ConfigSourceNotice source={running.source} error={running.error} />
        <ConfigSection
          title={t('configEditorTitle')}
          description={t('configEditorDescription')}
          actions={<DraftActions draft={draft} />}
        >
          <ConfigEditor draft={draft} />
        </ConfigSection>
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
