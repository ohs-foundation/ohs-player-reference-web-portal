import { useStatusBar, useTranslation } from 'ohs-player-web-core';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  addWidget,
  moveWidget,
  placeWidget,
  regionOf,
  removeWidget,
  type DashboardLayout,
  type IdTest,
} from './dashboardLayout';
import type { FocusRequest, MoveDirection } from './EditableTile';
import { useDashboardDraft } from './useDashboardDraft';
import type { DashboardLayoutState } from './useDashboardLayout';
import type { WidgetDefinition } from './widgetCatalogue';
import {
  EMPTY_SETTINGS,
  withoutWidget,
  withSetting,
  type DashboardSettings,
} from './widgetSettings';

export interface DashboardEditorOptions {
  saved: DashboardLayoutState;
  defaults: DashboardLayout;
  isVisible: IdTest;
  titleOf: (id: string) => string;
}

export interface DashboardEditor {
  editing: boolean;
  layout: DashboardLayout;
  settings: DashboardSettings;
  adding: boolean;
  focusRequest?: FocusRequest;
  announcement: string;
  addRef: RefObject<HTMLButtonElement>;
  configureRef: RefObject<HTMLButtonElement>;
  start: () => void;
  openAdd: () => void;
  closeAdd: () => void;
  add: (entry: WidgetDefinition) => void;
  move: (id: string, direction: MoveDirection) => void;
  startDrag: (id: string) => void;
  endDrag: () => void;
  acceptsDrop: (id: string) => boolean;
  dropOn: (targetId: string) => void;
  remove: (id: string) => void;
  setSetting: (entry: WidgetDefinition, key: string, value: string) => void;
  reset: () => void;
  cancel: () => void;
  save: () => void;
}

/** Configure mode for the dashboard: a draft layout, the add drawer, focus and announcements. */
export function useDashboardEditor({
  saved,
  defaults,
  isVisible,
  titleOf,
}: DashboardEditorOptions): DashboardEditor {
  const { t } = useTranslation();
  const { notify } = useStatusBar();
  const draft = useDashboardDraft({ layout: saved.layout, settings: saved.settings });
  const [adding, setAdding] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest>();
  const [announcement, setAnnouncement] = useState('');
  const [dragging, setDragging] = useState<string>();
  const addRef = useRef<HTMLButtonElement>(null);
  const configureRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const { layout, settings } = draft.arrangement;
  const setLayout = (next: DashboardLayout): void => draft.update({ layout: next, settings });

  useEffect(() => {
    if (draft.editing === wasEditing.current) return;
    wasEditing.current = draft.editing;
    (draft.editing ? addRef : configureRef).current?.focus();
  }, [draft.editing]);

  const announcePosition = (next: DashboardLayout, id: string): void => {
    const region = regionOf(next, id);
    if (!region) return;
    const position = next[region].filter(isVisible).indexOf(id) + 1;
    setAnnouncement(t('widgetMoved', { title: titleOf(id), position }));
  };

  const stop = (): void => {
    draft.stop();
    setFocusRequest(undefined);
    setAnnouncement('');
  };

  return {
    editing: draft.editing,
    layout,
    settings,
    adding,
    focusRequest,
    announcement,
    addRef,
    configureRef,
    start: draft.start,
    openAdd: () => {
      if (!draft.editing) draft.start();
      setAdding(true);
    },
    closeAdd: () => setAdding(false),
    add: (entry) => setLayout(addWidget(layout, entry.regions[0], entry.id, isVisible)),
    move: (id, direction) => {
      const next = moveWidget(layout, id, direction, isVisible);
      setLayout(next);
      setFocusRequest({ id, direction });
      announcePosition(next, id);
    },
    startDrag: setDragging,
    endDrag: () => setDragging(undefined),
    acceptsDrop: (id) =>
      dragging !== undefined &&
      dragging !== id &&
      regionOf(layout, dragging) === regionOf(layout, id),
    dropOn: (targetId) => {
      if (!dragging) return;
      const next = placeWidget(layout, dragging, targetId);
      setLayout(next);
      announcePosition(next, dragging);
      setDragging(undefined);
    },
    remove: (id) => {
      draft.update({ layout: removeWidget(layout, id), settings: withoutWidget(settings, id) });
      addRef.current?.focus();
      setAnnouncement(t('widgetRemoved', { title: titleOf(id) }));
    },
    setSetting: (entry, key, value) =>
      draft.update({ layout, settings: withSetting(settings, entry, key, value) }),
    reset: () => draft.update({ layout: defaults, settings: EMPTY_SETTINGS }),
    cancel: stop,
    save: () => {
      saved.save(draft.arrangement);
      stop();
      notify({ tone: 'success', title: t('dashboardSaved') });
    },
  };
}
