import { useTranslation } from 'ohs-player-web-core';
import { ErrorDetails } from 'ohs-player-web-shell';
import type { ParsedDraft } from './configDraft';

export function ConfigIssues({ id, parsed }: Readonly<{ id: string; parsed: ParsedDraft }>) {
  const { t } = useTranslation();
  if (parsed.kind === 'invalidJson') {
    return (
      <div id={id}>
        <ErrorDetails>{parsed.detail}</ErrorDetails>
      </div>
    );
  }
  if (parsed.kind !== 'invalid') return null;
  return (
    <ul id={id} className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-text">
      {parsed.issues.map((issue, index) => (
        <li key={`${issue.path}:${index}`}>
          <code className="font-mono">{issue.path || t('configIssueTopLevel')}</code>{' '}
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
