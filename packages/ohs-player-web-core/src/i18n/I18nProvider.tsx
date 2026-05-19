import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { I18nConfig, MessageCatalog } from '../types/config';
import { defaultMessageCatalog } from './locales/en';

const I18nContext = createContext<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  locale: string;
  formatDate: (d: Date) => string;
  formatNumber: (n: number) => string;
} | null>(null);

function mergeCatalog(
  base: MessageCatalog,
  partial?: Partial<MessageCatalog> | MessageCatalog,
): MessageCatalog {
  if (!partial) return base;
  return { ...base, ...partial } as MessageCatalog;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    const v = vars[name];
    return v !== undefined ? String(v) : '';
  });
}

export function I18nProvider({
  config,
  children,
}: {
  config: I18nConfig | undefined;
  children: ReactNode;
}): React.ReactElement {
  const locale = config?.locale ?? 'en';
  const catalog = useMemo(
    () => mergeCatalog(defaultMessageCatalog as unknown as MessageCatalog, config?.messages),
    [config?.messages],
  );
  const dir = config?.dir ?? 'ltr';

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const entry = catalog[key];
      if (typeof entry === 'function') {
        return interpolate(String(entry()), vars);
      }
      if (typeof entry === 'string') {
        return interpolate(entry, vars);
      }
      return key;
    },
    [catalog],
  );

  const formatDate = useCallback(
    (d: Date): string =>
      new Intl.DateTimeFormat(locale, config?.dateFormat ?? { dateStyle: 'medium' }).format(d),
    [config?.dateFormat, locale],
  );

  const formatNumber = useCallback(
    (n: number): string => new Intl.NumberFormat(locale, config?.numberFormat).format(n),
    [config?.numberFormat, locale],
  );

  const value = useMemo(
    () => ({
      t,
      dir,
      locale,
      formatDate,
      formatNumber,
    }),
    [t, dir, locale, formatDate, formatNumber],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): {
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  locale: string;
  formatDate: (d: Date) => string;
  formatNumber: (n: number) => string;
} {
  const c = useContext(I18nContext);
  if (!c) throw new Error('I18nProvider is required for useTranslation');
  return c;
}
