import { describe, expect, it } from 'vitest';
import {
  MONTHS_SETTING,
  ROWS_SETTING,
  WIDTH_SETTING,
  isFullWidth,
  sanitizeSettings,
  settingsOf,
  withoutWidget,
  withSetting,
} from './widgetSettings';

const recent = { id: 'recent.users', settings: [ROWS_SETTING, WIDTH_SETTING] };
const monthly = { id: 'chart.updatedByMonth.users', settings: [MONTHS_SETTING, WIDTH_SETTING] };
const kpi = { id: 'kpi.users', settings: [] };

describe('widget settings', () => {
  it('fills every setting with its default when nothing is chosen', () => {
    expect(settingsOf(recent, {})).toEqual({ rows: '5', width: 'normal' });
    expect(settingsOf(monthly, {})).toEqual({ months: '6', width: 'normal' });
    expect(settingsOf(kpi, {})).toEqual({});
  });

  it('keeps a chosen value and forgets it again once it is back at the default', () => {
    const chosen = withSetting({}, recent, 'rows', '10');
    expect(chosen).toEqual({ 'recent.users': { rows: '10' } });
    expect(settingsOf(recent, chosen)).toEqual({ rows: '10', width: 'normal' });

    expect(withSetting(chosen, recent, 'rows', '5')).toEqual({});
  });

  it('ignores a value no option offers', () => {
    expect(withSetting({}, recent, 'rows', '50')).toEqual({});
    expect(withSetting({}, kpi, 'width', 'full')).toEqual({});
  });

  it('trims stored settings to known cards, keys and values', () => {
    const stored = {
      'recent.users': { rows: '10', colour: 'red', width: 'huge' },
      'chart.updatedByMonth.users': { months: '12', width: 'full' },
      'gone.card': { rows: '10' },
    };

    expect(sanitizeSettings(stored, [recent, monthly, kpi])).toEqual({
      'recent.users': { rows: '10' },
      'chart.updatedByMonth.users': { months: '12', width: 'full' },
    });
    expect(sanitizeSettings('bad', [recent])).toEqual({});
  });

  it('drops a removed card and reads full width from its settings', () => {
    const settings = { 'recent.users': { width: 'full' } };

    expect(isFullWidth(settingsOf(recent, settings))).toBe(true);
    expect(withoutWidget(settings, 'recent.users')).toEqual({});
  });
});
