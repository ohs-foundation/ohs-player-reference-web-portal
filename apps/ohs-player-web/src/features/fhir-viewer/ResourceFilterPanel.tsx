import { useTranslation } from 'ohs-player-web-core';
import { Button, ChipSet, FilterChip, TextField } from '../../components/ui';
import type { ResourceTypeDef } from './registry';
import { type ActiveFilter, SINCE_PRESETS, type SincePreset } from './filterParams';

interface ResourceFilterPanelProps {
  def: ResourceTypeDef;
  active: ActiveFilter;
  onActive: (value: ActiveFilter) => void;
  statusText: string;
  onStatusText: (value: string) => void;
  since: SincePreset;
  onSince: (value: SincePreset) => void;
  onClear: () => void;
}

const SINCE_LABEL_KEY: Record<SincePreset, string> = {
  any: 'fhirViewerSinceAny',
  '24h': 'fhirViewerSince24h',
  '7d': 'fhirViewerSince7d',
  '30d': 'fhirViewerSince30d',
};

/**
 * Inline filter panel exposing only facets the backend can serve for this type: `_lastUpdated`
 * presets always, plus the `active`/`status` facet the registry declares. Controlled by the list
 * panel — presentation only.
 */
export function ResourceFilterPanel({
  def,
  active,
  onActive,
  statusText,
  onStatusText,
  since,
  onSince,
  onClear,
}: Readonly<ResourceFilterPanelProps>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="rounded border border-border bg-surface p-4 flex flex-col gap-4">
      {def.statusFacet === 'active' ? (
        <fieldset className="m-0 p-0 border-0 flex flex-col gap-2">
          <legend className="text-sm font-medium text-text-muted p-0">
            {t('fhirViewerFilterStatus')}
          </legend>
          <ChipSet>
            {(['all', 'active', 'inactive'] as const).map((option) => (
              <FilterChip
                key={option}
                label={t(`fhirViewerActive_${option}`)}
                selected={active === option}
                onChange={() => onActive(option)}
              />
            ))}
          </ChipSet>
        </fieldset>
      ) : null}

      {def.statusFacet === 'status' ? (
        <TextField
          label={t('fhirViewerFilterStatus')}
          instructions={t('fhirViewerFilterStatusHint')}
          value={statusText}
          onChange={(e) => onStatusText(e.target.value)}
        />
      ) : null}

      <fieldset className="m-0 p-0 border-0 flex flex-col gap-2">
        <legend className="text-sm font-medium text-text-muted p-0">
          {t('fhirViewerFilterUpdated')}
        </legend>
        <ChipSet>
          {SINCE_PRESETS.map((preset) => (
            <FilterChip
              key={preset}
              label={t(SINCE_LABEL_KEY[preset])}
              selected={since === preset}
              onChange={() => onSince(preset)}
            />
          ))}
        </ChipSet>
      </fieldset>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('fhirViewerFilterClear')}
        </Button>
      </div>
    </div>
  );
}
