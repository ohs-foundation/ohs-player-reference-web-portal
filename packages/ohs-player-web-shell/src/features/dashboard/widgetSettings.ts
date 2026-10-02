/** One card's chosen setting values, by setting key. */
export type WidgetSettings = Readonly<Record<string, string>>;

/** Chosen settings per card id. Only values that differ from a setting's default are kept. */
export type DashboardSettings = Readonly<Record<string, WidgetSettings>>;

export interface WidgetSettingOption {
  value: string;
  /** Message key for the option, given the value as `{{count}}`. */
  labelKey: string;
}

/** A choice a user can make for one card, such as its width or how many rows it lists. */
export interface WidgetSetting {
  key: string;
  labelKey: string;
  options: readonly WidgetSettingOption[];
  defaultValue: string;
}

interface SettingsOwner {
  id: string;
  settings: readonly WidgetSetting[];
}

export const EMPTY_SETTINGS: DashboardSettings = {};

function counted(labelKey: string, values: readonly string[]): WidgetSettingOption[] {
  return values.map((value) => ({ value, labelKey }));
}

export const WIDTH_SETTING: WidgetSetting = {
  key: 'width',
  labelKey: 'widgetSettingWidth',
  options: [
    { value: 'normal', labelKey: 'widgetWidthNormal' },
    { value: 'full', labelKey: 'widgetWidthFull' },
  ],
  defaultValue: 'normal',
};

export const ROWS_SETTING: WidgetSetting = {
  key: 'rows',
  labelKey: 'widgetSettingRows',
  options: counted('widgetRowsOption', ['5', '10']),
  defaultValue: '5',
};

export const MONTHS_SETTING: WidgetSetting = {
  key: 'months',
  labelKey: 'widgetSettingMonths',
  options: counted('widgetMonthsOption', ['3', '6', '12']),
  defaultValue: '6',
};

/** Every setting of `entry` with the stored value, or its default when none is stored. */
export function settingsOf(entry: SettingsOwner, settings: DashboardSettings): WidgetSettings {
  const stored = settings[entry.id] ?? {};
  return Object.fromEntries(
    entry.settings.map((setting) => [setting.key, stored[setting.key] ?? setting.defaultValue]),
  );
}

export function isFullWidth(settings: WidgetSettings): boolean {
  return settings[WIDTH_SETTING.key] === 'full';
}

function knownValues(entry: SettingsOwner, value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {};
  const stored = value as Record<string, unknown>;
  return Object.fromEntries(
    entry.settings.flatMap((setting) => {
      const chosen = stored[setting.key];
      const valid =
        chosen !== setting.defaultValue && setting.options.some((o) => o.value === chosen);
      return valid ? [[setting.key, chosen as string]] : [];
    }),
  );
}

/** Stored settings cut to cards, keys and values the catalogue knows, defaults dropped. */
export function sanitizeSettings(
  value: unknown,
  catalogue: readonly SettingsOwner[],
): DashboardSettings {
  if (typeof value !== 'object' || value === null) return EMPTY_SETTINGS;
  const stored = value as Record<string, unknown>;
  return Object.fromEntries(
    catalogue.flatMap((entry) => {
      const kept = knownValues(entry, stored[entry.id]);
      return Object.keys(kept).length > 0 ? [[entry.id, kept]] : [];
    }),
  );
}

/** Sets one value for one card, forgetting it when it equals the setting's default. */
export function withSetting(
  settings: DashboardSettings,
  entry: SettingsOwner,
  key: string,
  value: string,
): DashboardSettings {
  const next = knownValues(entry, { ...settings[entry.id], [key]: value });
  const rest = withoutWidget(settings, entry.id);
  return Object.keys(next).length > 0 ? { ...rest, [entry.id]: next } : rest;
}

export function withoutWidget(settings: DashboardSettings, id: string): DashboardSettings {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => key !== id));
}

export function hasSettings(settings: DashboardSettings): boolean {
  return Object.keys(settings).length > 0;
}
