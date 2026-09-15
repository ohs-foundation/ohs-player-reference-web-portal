import * as Toast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusEvent {
  id: number;
  tone: StatusTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface StatusContextValue {
  notify: (e: Omit<StatusEvent, 'id'>) => void;
  /** Convenience for the OHS save lifecycle: Saving → Saved / Could not save. */
  saving: () => SavingHandle;
}

interface SavingHandle {
  succeeded: () => void;
  failed: (retry?: () => void) => void;
}

const StatusBarContext = createContext<StatusContextValue | null>(null);

/**
 * App-wide save/sync status feed. Translates the OHS sync-status guideline
 * (https://developers.google.com/open-health-stack/design/offline-sync-guideline)
 * to a web admin context: `Saving…` → `Saved` (success, auto-dismiss) or
 * `Could not save — Retry` (error, persistent).
 */
export function StatusBarProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const { t } = useTranslation();

  const notify = useCallback((e: Omit<StatusEvent, 'id'>) => {
    setEvents((prev) => [...prev, { ...e, id: Date.now() + Math.random() }]);
  }, []);

  const saving = useCallback((): SavingHandle => {
    const id = Date.now() + Math.random();
    setEvents((prev) => [...prev, { id, tone: 'info', title: t('saving') }]);
    return {
      succeeded: () => {
        setEvents((prev) => [
          ...prev.filter((e) => e.id !== id),
          { id: Date.now() + Math.random(), tone: 'success', title: t('saved') },
        ]);
      },
      failed: (retry) => {
        setEvents((prev) => [
          ...prev.filter((e) => e.id !== id),
          {
            id: Date.now() + Math.random(),
            tone: 'error',
            title: t('saveFailed'),
            actionLabel: retry ? t('retry') : undefined,
            onAction: retry,
          },
        ]);
      },
    };
  }, [t]);

  return (
    <StatusBarContext.Provider value={{ notify, saving }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {events.map((e) => (
          <Toast.Root
            key={e.id}
            className="ohs-toast-root"
            data-tone={e.tone}
            duration={e.tone === 'error' ? 8000 : 3500}
            onOpenChange={(open) => {
              if (!open) setEvents((prev) => prev.filter((x) => x.id !== e.id));
            }}
          >
            <Toast.Title className="ohs-toast-title">{e.title}</Toast.Title>
            {e.description ? (
              <Toast.Description className="ohs-toast-description">
                {e.description}
              </Toast.Description>
            ) : null}
            {e.actionLabel && e.onAction ? (
              <Toast.Action altText={e.actionLabel} asChild>
                <button
                  type="button"
                  className="ohs-button"
                  data-variant="ghost"
                  data-size="sm"
                  onClick={e.onAction}
                >
                  {e.actionLabel}
                </button>
              </Toast.Action>
            ) : null}
            <Toast.Close className="ohs-toast-close" aria-label={t('close')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="ohs-toast-viewport" />
      </Toast.Provider>
    </StatusBarContext.Provider>
  );
}

export function useStatusBar(): StatusContextValue {
  const ctx = useContext(StatusBarContext);
  if (!ctx) {
    throw new Error('useStatusBar must be used inside StatusBarProvider');
  }
  return ctx;
}
