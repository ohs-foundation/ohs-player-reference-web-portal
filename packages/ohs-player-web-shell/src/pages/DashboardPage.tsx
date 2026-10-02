import { PermissionGuard, useTranslation } from 'ohs-player-web-core';
import { useCallback, useMemo, type ReactNode } from 'react';
import { Button, EmptyState, Page, PageHeader, Stack } from '../components/ui';
import { AddWidgetDrawer } from '../features/dashboard/AddWidgetDrawer';
import { DashboardEditBar } from '../features/dashboard/DashboardEditBar';
import {
  DashboardRows,
  RegionCards,
  type DashboardCard,
} from '../features/dashboard/DashboardRegions';
import {
  defaultLayout,
  isAtKpiCap,
  type DashboardLayout,
} from '../features/dashboard/dashboardLayout';
import { EditableTile } from '../features/dashboard/EditableTile';
import { useDashboardEditor, type DashboardEditor } from '../features/dashboard/useDashboardEditor';
import { useDashboardLayout } from '../features/dashboard/useDashboardLayout';
import { VisibleWidgets } from '../features/dashboard/VisibleWidgets';
import { useWidgetCatalogue, type WidgetDefinition } from '../features/dashboard/widgetCatalogue';
import { DASHBOARD_REGIONS, type DashboardRegion } from '../host/types';

interface DashboardViewProps {
  catalogue: readonly WidgetDefinition[];
  visible: readonly WidgetDefinition[];
}

function idsIn(layout: DashboardLayout): Set<string> {
  return new Set(DASHBOARD_REGIONS.flatMap((region) => layout[region]));
}

function DashboardView({ catalogue, visible }: Readonly<DashboardViewProps>): ReactNode {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(visible.map((entry) => [entry.id, entry])), [visible]);
  const isVisible = useCallback((id: string) => byId.has(id), [byId]);
  const titleOf = (id: string): string => t(byId.get(id)?.titleKey ?? id);
  const defaults = useMemo(() => defaultLayout(visible), [visible]);
  const saved = useDashboardLayout({ catalogue, defaults, isVisible });
  const editor = useDashboardEditor({ saved, defaults, isVisible, titleOf });

  const cardsIn = (region: DashboardRegion): DashboardCard[] =>
    editor.layout[region].flatMap((id, _, ids) => {
      const entry = byId.get(id);
      if (!entry) return [];
      const shown = ids.filter(isVisible);
      return [{ key: id, node: tile(editor, entry, titleOf(id), shown.indexOf(id), shown.length) }];
    });

  const kpi = cardsIn('kpi');
  const main = cardsIn('main');
  const side = cardsIn('side');

  return (
    <Page>
      <PageHeader
        title={t('pageDashboard')}
        description={t('pageDashboardDescription')}
        actions={
          editor.editing ? null : (
            <Button variant="outlined" onClick={editor.start}>
              {t('dashboardConfigure')}
            </Button>
          )
        }
      />
      <PermissionGuard permission="dashboard.view">
        <Stack gap={5}>
          {editor.editing ? (
            <DashboardEditBar
              addRef={editor.addRef}
              onAdd={editor.openAdd}
              onReset={editor.reset}
              onCancel={editor.cancel}
              onSave={editor.save}
            />
          ) : null}
          {kpi.length + main.length + side.length === 0 ? (
            <EmptyState
              title={t('dashboardEmptyTitle')}
              description={t('dashboardEmptyDescription')}
              action={
                editor.editing ? null : (
                  <Button onClick={editor.openAdd}>{t('dashboardAddWidget')}</Button>
                )
              }
            />
          ) : null}
          {kpi.length > 0 ? (
            <section aria-label={t('pageDashboard')} className="ohs-kpi-grid">
              <RegionCards cards={kpi} />
            </section>
          ) : null}
          <DashboardRows main={main} side={side} />
        </Stack>
      </PermissionGuard>
      <AddWidgetDrawer
        open={editor.adding}
        onClose={editor.closeAdd}
        entries={visible}
        placed={idsIn(editor.layout)}
        starting={idsIn(defaults)}
        atKpiCap={isAtKpiCap(editor.layout, isVisible)}
        onAdd={editor.add}
      />
      <p className="ohs-visually-hidden" aria-live="polite">
        {editor.announcement}
      </p>
    </Page>
  );
}

function tile(
  editor: DashboardEditor,
  entry: WidgetDefinition,
  title: string,
  index: number,
  count: number,
): ReactNode {
  if (!editor.editing) return entry.render();
  return (
    <EditableTile
      title={title}
      first={index === 0}
      last={index === count - 1}
      focusRequest={editor.focusRequest?.id === entry.id ? editor.focusRequest : undefined}
      onMove={(direction) => editor.move(entry.id, direction)}
      onRemove={() => editor.remove(entry.id)}
    >
      {entry.render()}
    </EditableTile>
  );
}

export function DashboardPage(): ReactNode {
  const catalogue = useWidgetCatalogue();
  return (
    <VisibleWidgets catalogue={catalogue}>
      {(visible) => <DashboardView catalogue={catalogue} visible={visible} />}
    </VisibleWidgets>
  );
}
