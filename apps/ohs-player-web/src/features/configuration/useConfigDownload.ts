import { useCallback } from 'react';
import { AUDIT_ENTITY_TYPE_SYSTEM, useStatusBar, useTranslation } from 'ohs-player-web-core';
import type { PortalConfig } from '../../config/portalConfigSchema';
import { useWriteAudit } from '../audit/useWriteAudit';
import type { DocumentChange } from './documentDiff';
import { downloadAuditDescription, downloadDocument } from './downloadConfig';

const SYSTEM_OBJECT = { system: AUDIT_ENTITY_TYPE_SYSTEM, code: '2', display: 'System Object' };

export function useConfigDownload(): (
  document: PortalConfig,
  changes: readonly DocumentChange[],
  proposed: boolean,
) => Promise<void> {
  const writeAudit = useWriteAudit();
  const status = useStatusBar();
  const { t } = useTranslation();

  return useCallback(
    async (document, changes, proposed) => {
      downloadDocument(document);
      try {
        await writeAudit({
          action: 'execute',
          entityType: SYSTEM_OBJECT,
          description: downloadAuditDescription(changes, proposed),
        });
        status.notify({ tone: 'success', title: t('configDownloaded') });
      } catch {
        status.notify({
          tone: 'warning',
          title: t('configDownloaded'),
          description: t('configAuditFailed'),
        });
      }
    },
    [writeAudit, status, t],
  );
}
