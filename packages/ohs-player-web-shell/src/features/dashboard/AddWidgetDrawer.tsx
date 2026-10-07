import { useTranslation } from 'ohs-player-web-core';
import { useId, useState, type ReactNode } from 'react';
import { Button, Drawer, IconButton, StatusBadge } from '../../components/ui';
import { IconClose } from '../../components/ui/icons';
import { MAX_KPIS } from './dashboardLayout';
import type { WidgetDefinition } from './widgetCatalogue';

export interface AddWidgetDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The cards this user may add, in catalogue order. */
  entries: readonly WidgetDefinition[];
  placed: ReadonlySet<string>;
  atKpiCap: boolean;
  onAdd: (entry: WidgetDefinition) => void;
}

interface WidgetGroup {
  categoryKey: string;
  entries: WidgetDefinition[];
}

function byCategory(entries: readonly WidgetDefinition[]): WidgetGroup[] {
  const groups = new Map<string, WidgetDefinition[]>();
  for (const entry of entries) {
    groups.set(entry.categoryKey, [...(groups.get(entry.categoryKey) ?? []), entry]);
  }
  return [...groups].map(([categoryKey, grouped]) => ({ categoryKey, entries: grouped }));
}

interface WidgetOptionProps {
  title: string;
  added: boolean;
  capped: boolean;
  capNoticeId: string;
  onAdd: () => void;
}

function WidgetOption({
  title,
  added,
  capped,
  capNoticeId,
  onAdd,
}: Readonly<WidgetOptionProps>): ReactNode {
  const { t } = useTranslation();
  const blocked = added || capped;
  return (
    <li className="ohs-widget-picker__option">
      <span className="ohs-widget-picker__title">{title}</span>
      {added ? <StatusBadge tone="success">{t('widgetAdded')}</StatusBadge> : null}
      <Button
        variant="outlined"
        size="sm"
        aria-label={t('widgetAddNamed', { title })}
        aria-disabled={blocked || undefined}
        aria-describedby={capped && !added ? capNoticeId : undefined}
        onClick={() => {
          if (!blocked) onAdd();
        }}
      >
        {t('widgetAdd')}
      </Button>
    </li>
  );
}

/** The catalogue a user may add from, grouped by category, marking the cards already placed. */
export function AddWidgetDrawer({
  open,
  onClose,
  entries,
  placed,
  atKpiCap,
  onAdd,
}: Readonly<AddWidgetDrawerProps>): ReactNode {
  const { t } = useTranslation();
  const capNoticeId = useId();
  const [announcement, setAnnouncement] = useState('');

  const header = (
    <div className="ohs-form-drawer__head">
      <h2 className="ohs-form-drawer__title">{t('dashboardAddWidget')}</h2>
      <IconButton label={t('close')} onClick={onClose}>
        <IconClose size={24} />
      </IconButton>
    </div>
  );

  const add = (entry: WidgetDefinition): void => {
    onAdd(entry);
    setAnnouncement(t('widgetAddedAnnouncement', { title: t(entry.titleKey) }));
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('dashboardAddWidget')} header={header}>
      <div className="ohs-widget-picker">
        {atKpiCap ? (
          <p id={capNoticeId} className="ohs-widget-picker__notice">
            {t('kpiPickerLimit', { max: MAX_KPIS })}
          </p>
        ) : null}
        {byCategory(entries).map((group) => (
          <section key={group.categoryKey} className="ohs-widget-picker__group">
            <h3 className="ohs-widget-picker__category">{t(group.categoryKey)}</h3>
            <ul className="ohs-widget-picker__list">
              {group.entries.map((entry) => (
                <WidgetOption
                  key={entry.id}
                  title={t(entry.titleKey)}
                  added={placed.has(entry.id)}
                  capped={atKpiCap && entry.regions[0] === 'kpi'}
                  capNoticeId={capNoticeId}
                  onAdd={() => add(entry)}
                />
              ))}
            </ul>
          </section>
        ))}
        <p className="ohs-visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
    </Drawer>
  );
}
