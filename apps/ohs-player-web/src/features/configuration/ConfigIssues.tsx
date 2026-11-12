import { useTranslation } from 'ohs-player-web-core';
import { ErrorDetails } from 'ohs-player-web-shell';
import type { ParsedDraft } from './configDraft';

type Translate = (key: string, values?: Record<string, string | number>) => string;

function draftProblem(parsed: ParsedDraft, t: Translate): string | undefined {
  if (parsed.kind === 'invalidJson') return t('configInvalidJson');
  if (parsed.kind === 'notAnObject') return t('configNotAnObject');
  if (parsed.kind === 'invalid') return t('configIssueCount', { count: parsed.issues.length });
  return undefined;
}

export function ConfigIssues({ id, parsed }: Readonly<{ id: string; parsed: ParsedDraft }>) {
  const { t } = useTranslation();
  const problem = draftProblem(parsed, t);
  if (!problem) return null;
  return (
    <div id={id} className="flex flex-col gap-1 text-sm text-text">
      <p className="m-0 font-semibold text-error">{problem}</p>
      {parsed.kind === 'invalidJson' ? <ErrorDetails>{parsed.detail}</ErrorDetails> : null}
      {parsed.kind === 'invalid' ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {parsed.issues.map((issue, index) => (
            <li key={`${issue.path}:${index}`}>
              {issue.path ? <code className="font-mono">{issue.path}</code> : null} {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
