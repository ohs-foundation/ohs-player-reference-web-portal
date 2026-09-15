import { useMemo, useState } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { Stack } from '../../../components/ui';
import { LocationFormFields } from '../../locations/LocationForm';
import {
  answersToDraftLocation,
  draftLocationToAnswers,
  orderDraftLocations,
} from '../../locations/locationDraft';
import { useAllLocationsLean } from '../../locations/useLocationRoots';
import { DraftList, StepIntro } from '../DraftList';
import type { DraftLocation } from '../types';

/** Wizard step: add/list/remove draft locations. */
export function LocationsStep({
  locations,
  onChange,
}: Readonly<{
  locations: DraftLocation[];
  onChange: (next: DraftLocation[]) => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const all = useAllLocationsLean(true);
  const serverLocs = useMemo(() => all.data ?? [], [all.data]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const parentOptions = useMemo(() => {
    const root = { value: '__root__', label: t('rootLocation') };
    const draftOpts = locations
      .filter((l) => l.fullUrl !== editingId)
      .map((l) => ({
        value: l.fullUrl,
        label: `${l.resource.name} (${t('setupDraftBadge')})`,
      }));
    const serverOpts = serverLocs
      .filter((l) => l.id)
      .map((l) => ({
        value: `Location/${l.id as string}`,
        label: l.name?.trim() ? l.name : (l.id as string),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return [root, ...draftOpts, ...serverOpts];
  }, [locations, serverLocs, editingId, t]);

  const labelForParent = (ref: string | undefined): string => {
    if (!ref) return t('rootLocation');
    const draft = locations.find((l) => l.fullUrl === ref);
    if (draft) return draft.resource.name;
    const id = ref.replace(/^Location\//, '');
    const server = serverLocs.find((l) => l.id === id);
    return server?.name ?? ref;
  };

  const editing = editingId ? locations.find((l) => l.fullUrl === editingId) : undefined;
  const ordered = orderDraftLocations(locations);

  return (
    <Stack gap={6}>
      <StepIntro
        text={t('setupLocationsIntro')}
        count={locations.length}
        countLabel={t('setupCountLocations')}
      />

      <LocationFormFields
        key={editingId ?? 'new-location'}
        formClassName="ohs-setup-form--panel"
        parentOptions={parentOptions}
        draftLocations={locations}
        selfId={editingId ?? undefined}
        initialAnswers={editing ? draftLocationToAnswers(editing) : undefined}
        clearOnSubmit={!editingId}
        submitLabel={editingId ? t('setupUpdateDraft') : t('setupAddLocation')}
        onCancel={editingId ? () => setEditingId(null) : undefined}
        onSubmit={(answers) => {
          const nextLoc = answersToDraftLocation(answers, editingId ?? undefined);
          if (editingId) {
            onChange(locations.map((l) => (l.fullUrl === editingId ? nextLoc : l)));
            setEditingId(null);
          } else {
            onChange([...locations, nextLoc]);
          }
        }}
      />

      <DraftList
        items={ordered.map(({ loc, depth }) => ({
          id: loc.fullUrl,
          title: loc.resource.name,
          meta: `${t('locationsParentLocation')}: ${labelForParent(loc.resource.partOf?.reference)} · ${loc.resource.status}`,
          depth,
        }))}
        emptyTitle={t('setupLocationsEmpty')}
        emptyHint={t('setupLocationsEmptyHint')}
        selectedId={editingId}
        onSelect={setEditingId}
        onRemove={(id) => {
          onChange(locations.filter((l) => l.fullUrl !== id));
          if (editingId === id) setEditingId(null);
        }}
      />
    </Stack>
  );
}
