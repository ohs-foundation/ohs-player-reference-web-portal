import { useContext, useId, useMemo } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { Button, ExtensionsContext, StatusBadge } from 'ohs-player-web-shell';
import type { PortalConfig } from '../../config/portalConfigSchema';
import { ConfigSection } from './ConfigSection';
import { previewNavigation } from './previewNavigation';

interface ConfigPreviewPanelProps {
  document: PortalConfig;
  onEnd: () => void;
}

export function ConfigPreviewPanel({ document, onEnd }: Readonly<ConfigPreviewPanelProps>) {
  const { t } = useTranslation();
  const { nav } = useContext(ExtensionsContext);
  const listLabelId = useId();
  const entries = useMemo(() => previewNavigation(document, nav), [document, nav]);
  return (
    <ConfigSection
      title={t('configPreviewTitle')}
      actions={
        <Button variant="outlined" onClick={onEnd}>
          {t('configPreviewEnd')}
        </Button>
      }
    >
      <p role="status" className="m-0 text-text">
        {t('configPreviewActive')}
      </p>
      <p id={listLabelId} className="m-0 font-semibold text-text">
        {t('configPreviewSidebar')}
      </p>
      <ol aria-labelledby={listLabelId} className="m-0 flex flex-col gap-2 pl-6 text-text">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span className="inline-flex flex-wrap items-center gap-2">
              {t(entry.labelKey)}
              <code className="font-mono text-sm text-text-muted">{entry.to}</code>
              {entry.switchedOff ? (
                <StatusBadge tone="neutral">{t('configPreviewSwitchedOff')}</StatusBadge>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </ConfigSection>
  );
}
