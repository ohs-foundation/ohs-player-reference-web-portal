import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type { I18nConfig } from '../types/config';
import { I18nProvider, useTranslation } from './I18nProvider';

const instant = new Date('2026-09-22T08:30:00.000Z');

function renderTranslation(config: I18nConfig) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(I18nProvider, { config, children });
  return renderHook(() => useTranslation(), { wrapper }).result.current;
}

describe('I18nProvider date formatting', () => {
  it('formatDateTime defaults to a medium date and a short time in the locale', () => {
    const { formatDateTime } = renderTranslation({ locale: 'en-GB' });
    const expected = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(instant);
    expect(formatDateTime(instant)).toBe(expected);
  });

  it('formatDateTime honours dateTimeFormat, including a pinned time zone', () => {
    const { formatDateTime } = renderTranslation({
      locale: 'en-GB',
      dateTimeFormat: { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Nairobi' },
    });
    expect(formatDateTime(instant)).toBe('22/09/2026, 11:30');
  });

  it('formatDate still formats the date only and ignores dateTimeFormat', () => {
    const { formatDate } = renderTranslation({
      locale: 'en-GB',
      dateTimeFormat: { timeStyle: 'short' },
    });
    expect(formatDate(instant)).toBe(
      new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(instant),
    );
  });
});
