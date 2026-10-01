import { useCallback } from 'react';
import { useStatusBar, useTranslation } from 'ohs-player-web-core';
import { useWriteAudit } from '../audit/useWriteAudit';
import { importAuditDescription } from './importAudit';
import { type ImportOutcome } from './importStream';
import { type ImportTemplate } from './importTemplates';

export function useImportAudit(
  template: ImportTemplate,
): (fileName: string, outcome: ImportOutcome) => Promise<void> {
  const writeAudit = useWriteAudit();
  const status = useStatusBar();
  const { t } = useTranslation();

  return useCallback(
    async (fileName: string, outcome: ImportOutcome) => {
      try {
        await writeAudit({
          action: 'create',
          resourceType: template.auditResourceType,
          description: importAuditDescription(fileName, outcome),
        });
      } catch {
        status.notify({ tone: 'error', title: t('bulkImportAuditFailed') });
      }
    },
    [writeAudit, status, t, template.auditResourceType],
  );
}
