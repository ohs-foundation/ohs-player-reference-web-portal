import { PORTAL_CONFIG_FILE } from '../../config/loadPortalConfig';
import type { PortalConfig } from '../../config/portalConfigSchema';
import { draftText } from './configDraft';
import type { DocumentChange } from './documentDiff';

const SUMMARY_LIMIT = 5;

export function downloadDocument(document: PortalConfig): void {
  const blob = new Blob([draftText(document)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = PORTAL_CONFIG_FILE;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAuditDescription(
  changes: readonly DocumentChange[],
  assisted: boolean,
): string {
  if (changes.length === 0) return `${PORTAL_CONFIG_FILE} downloaded with no changes`;
  const noun = changes.length === 1 ? 'change' : 'changes';
  const origin = assisted ? ', including an assistant proposal' : '';
  const shown = changes
    .slice(0, SUMMARY_LIMIT)
    .map((entry) => entry.path)
    .join(', ');
  const more = changes.length > SUMMARY_LIMIT ? ` and ${changes.length - SUMMARY_LIMIT} more` : '';
  return `${PORTAL_CONFIG_FILE} downloaded with ${changes.length} ${noun}${origin}: ${shown}${more}`;
}
