import { useId } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { Stack, TextAreaField } from 'ohs-player-web-shell';
import type { ParsedDraft } from './configDraft';
import { ConfigIssues } from './ConfigIssues';
import type { ConfigDraft } from './useConfigDraft';

function draftProblem(
  parsed: ParsedDraft,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | undefined {
  if (parsed.kind === 'invalidJson') return t('configInvalidJson');
  if (parsed.kind === 'notAnObject') return t('configNotAnObject');
  if (parsed.kind === 'invalid') return t('configIssueCount', { count: parsed.issues.length });
  return undefined;
}

interface ConfigEditorProps {
  draft: ConfigDraft;
  readOnly?: boolean;
}

export function ConfigEditor({ draft, readOnly }: Readonly<ConfigEditorProps>) {
  const { t } = useTranslation();
  const issuesId = useId();
  const problem = draftProblem(draft.parsed, t);
  return (
    <Stack gap={2}>
      <TextAreaField
        label={t('configEditorLabel')}
        instructions={t('configEditorInstructions')}
        value={draft.text}
        onChange={(event) => draft.setText(event.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        error={problem}
        aria-describedby={problem ? issuesId : undefined}
        className="min-h-[420px] font-mono text-sm leading-relaxed"
      />
      <ConfigIssues id={issuesId} parsed={draft.parsed} />
    </Stack>
  );
}
