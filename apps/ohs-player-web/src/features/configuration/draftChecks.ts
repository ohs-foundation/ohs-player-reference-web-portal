import { createPortalHost } from 'ohs-player-web-shell';
import { appRoutes } from '../../AppRoutes';
import { portalDefaults } from '../../config/platform';
import type { PortalConfig, PortalConfigIssue } from '../../config/portalConfigSchema';
import { extensions } from '../../extensions';
import { parseDraft, type ParsedDraft } from './configDraft';

function hostIssues(document: PortalConfig): PortalConfigIssue[] {
  try {
    createPortalHost({
      defaults: portalDefaults,
      document,
      extensions,
      routes: appRoutes,
      development: true,
    });
    return [];
  } catch (error) {
    return [{ path: '', message: error instanceof Error ? error.message : String(error) }];
  }
}

export function checkDraft(text: string): ParsedDraft {
  const draft = parseDraft(text);
  if (draft.kind !== 'valid') return draft;
  const issues = hostIssues(draft.document);
  return issues.length > 0 ? { kind: 'invalid', value: draft.document, issues } : draft;
}
