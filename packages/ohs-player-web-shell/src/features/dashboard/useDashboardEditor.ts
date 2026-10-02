import { useStatusBar, useTranslation } from 'ohs-player-web-core';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  addWidget,
  moveWidget,
  regionOf,
  removeWidget,
  type DashboardLayout,
  type IdTest,
} from './dashboardLayout';
import type { FocusRequest, MoveDirection } from './EditableTile';
import { useDashboardDraft } from './useDashboardDraft';
import type { DashboardLayoutState } from './useDashboardLayout';
import type { WidgetDefinition } from './widgetCatalogue';

export interface DashboardEditorOptions {
  saved: DashboardLayoutState;
  defaults: DashboardLayout;
  isVisible: IdTest;
  titleOf: (id: string) => string;
}

export interface DashboardEditor {
  editing: boolean;
  layout: DashboardLayout;
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
  remove: (id: string) => void;
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
  const draft = useDashboardDraft(saved.layout);
  const [adding, setAdding] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest>();
  const [announcement, setAnnouncement] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const configureRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const layout = draft.layout;

  useEffect(() => {
    if (draft.editing === wasEditing.current) return;
    wasEditing.current = draft.editing;
    (draft.editing ? addRef : configureRef).current?.focus();
  }, [draft.editing]);

  const stop = (): void => {
    draft.stop();
    setFocusRequest(undefined);
    setAnnouncement('');
  };

  return {
    editing: draft.editing,
    layout,
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
    add: (entry) => draft.update(addWidget(layout, entry.regions[0], entry.id, isVisible)),
    move: (id, direction) => {
      const next = moveWidget(layout, id, direction, isVisible);
      const region = regionOf(next, id);
      draft.update(next);
      setFocusRequest({ id, direction });
      if (region) {
        const position = next[region].filter(isVisible).indexOf(id) + 1;
        setAnnouncement(t('widgetMoved', { title: titleOf(id), position }));
      }
    },
    remove: (id) => {
      draft.update(removeWidget(layout, id));
      addRef.current?.focus();
      setAnnouncement(t('widgetRemoved', { title: titleOf(id) }));
    },
    reset: () => draft.update(defaults),
    cancel: stop,
    save: () => {
      saved.save(layout);
      stop();
      notify({ tone: 'success', title: t('dashboardSaved') });
    },
  };
}
