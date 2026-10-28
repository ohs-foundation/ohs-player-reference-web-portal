import { useId } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { Stack, TextAreaField } from 'ohs-player-web-shell';
import { ConfigIssues } from './ConfigIssues';
import type { ConfigDraft } from './useConfigDraft';

interface ConfigEditorProps {
  draft: ConfigDraft;
  readOnly?: boolean;
}

export function ConfigEditor({ draft, readOnly }: Readonly<ConfigEditorProps>) {
  const { t } = useTranslation();
  const issuesId = useId();
  const invalid = draft.parsed.kind !== 'valid';
  return (
    <Stack gap={2}>
      <TextAreaField
        label={t('configEditorLabel')}
        instructions={t('configEditorInstructions')}
        value={draft.text}
        onChange={(event) => draft.setText(event.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? issuesId : undefined}
        className="min-h-[420px] font-mono text-sm leading-relaxed"
      />
      <ConfigIssues id={issuesId} parsed={draft.parsed} />
    </Stack>
  );
}
