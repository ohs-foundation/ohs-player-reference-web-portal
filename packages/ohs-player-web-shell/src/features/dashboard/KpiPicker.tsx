import { useTranslation } from 'ohs-player-web-core';
import { useId, useState } from 'react';
import { Button, Checkbox, Popover } from '../../components/ui';
import { CustomizeWidgetsButton } from './CustomizeWidgetsButton';
import type { KpiDefinition, KpiId } from './kpiCatalogue';
import { toggleKpi } from './kpiSelection';

export interface KpiPickerProps {
  options: readonly KpiDefinition[];
  selected: readonly KpiId[];
  max: number;
  onSave: (ids: readonly KpiId[]) => void;
}

/** Header control and panel for choosing the KPI cards; edits stay local until Save. */
export function KpiPicker({
  options,
  selected,
  max,
  onSave,
}: Readonly<KpiPickerProps>): React.ReactElement {
  const { t } = useTranslation();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<readonly KpiId[]>([]);
  const atMax = draft.length >= max;

  const onOpenChange = (next: boolean): void => {
    if (next) setDraft(selected.filter((id) => options.some((kpi) => kpi.id === id)));
    setOpen(next);
  };

  const save = (): void => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={<CustomizeWidgetsButton />}
      labelledBy={titleId}
      className="ohs-kpi-picker"
    >
      <p id={titleId} className="ohs-kpi-picker__title">
        {t('kpiPickerTitle', { max })}
      </p>
      <div role="status">
        {atMax ? <p className="ohs-kpi-picker__notice">{t('kpiPickerLimit', { max })}</p> : null}
      </div>
      <div role="group" aria-labelledby={titleId}>
        {options.map((kpi) => {
          const checked = draft.includes(kpi.id);
          return (
            <KpiOption
              key={kpi.id}
              label={t(kpi.optionKey)}
              checked={checked}
              disabled={atMax && !checked}
              onToggle={() => setDraft((current) => toggleKpi(current, kpi.id, max))}
            />
          );
        })}
      </div>
      <div className="ohs-kpi-picker__actions">
        <Button variant="outlined" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
        <Button onClick={save}>{t('save')}</Button>
      </div>
    </Popover>
  );
}

interface KpiOptionProps {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function KpiOption({
  label,
  checked,
  disabled,
  onToggle,
}: Readonly<KpiOptionProps>): React.ReactElement {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="ohs-kpi-picker__option ohs-state-layer"
      data-disabled={disabled || undefined}
    >
      <Checkbox id={id} checked={checked} disabled={disabled} onChange={onToggle} />
      <span className="ohs-kpi-picker__option-label">{label}</span>
    </label>
  );
}
