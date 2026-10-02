import { useTranslation } from 'ohs-player-web-core';
import type { ReactNode } from 'react';
import { SelectField } from '../../components/ui';
import type { WidgetSetting, WidgetSettings } from './widgetSettings';

export interface WidgetSettingsPanelProps {
  headingId: string;
  title: string;
  settings: readonly WidgetSetting[];
  values: WidgetSettings;
  onChange: (key: string, value: string) => void;
}

/** One select per setting of a card. Each change applies to the draft at once. */
export function WidgetSettingsPanel({
  headingId,
  title,
  settings,
  values,
  onChange,
}: Readonly<WidgetSettingsPanelProps>): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="ohs-widget-settings">
      <h3 id={headingId} className="ohs-widget-settings__title">
        {t('widgetSettingsTitle', { title })}
      </h3>
      {settings.map((setting) => (
        <SelectField
          key={setting.key}
          label={t(setting.labelKey)}
          value={values[setting.key]}
          options={setting.options.map((option) => ({
            value: option.value,
            label: t(option.labelKey, { count: option.value }),
          }))}
          onChange={(event) => onChange(setting.key, event.target.value)}
        />
      ))}
    </div>
  );
}
