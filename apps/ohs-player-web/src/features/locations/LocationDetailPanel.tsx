import { useState } from 'react';
import type { Location } from '@medplum/fhirtypes';
import { RiCloseLine, RiFileCopyLine, RiInformationLine, RiNodeTree } from '@remixicon/react';
import { useResource, useTranslation } from 'ohs-player-web-core';
import { Drawer, IconButton, Spinner, Stack } from '../../components/ui';
import { Section } from '../users/userFormControls';
import { findNode, type LocationNode } from './hierarchy';
import { levelFromLocation, physicalTypesFromLocation } from './locationLevel';
import { LocationLevelBadge, PhysicalTypeChip } from './LocationLevelBadge';
import { LocationBreadcrumb } from './LocationBreadcrumb';

export interface LocationDetailPanelProps {
  root: LocationNode;
  nodeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{children}</span>
    </div>
  );
}

export function LocationDetailPanel({ root, nodeId, onClose, onSelect }: Readonly<LocationDetailPanelProps>): React.ReactElement {
  const { t } = useTranslation();
  const node = findNode(root, nodeId);
  const read = useResource('Location', nodeId);
  const location = read.data as Location | undefined;
  const [copied, setCopied] = useState(false);

  const level = levelFromLocation(location);
  const physicalTypes = physicalTypesFromLocation(location);
  const parent = node?.partOf ? findNode(root, node.partOf) : undefined;
  const childCount = node?.children.length ?? 0;
  const partial = Boolean(node?.hasMoreChildren);
  const name = node?.name ?? location?.name ?? t('locationsUnnamed', { id: nodeId });

  const copyId = () => {
    void navigator.clipboard?.writeText(nodeId).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  let headerBadge: React.ReactNode = null;
  if (read.isLoading) headerBadge = <Spinner />;
  else if (level) headerBadge = <LocationLevelBadge tone={level.tone} labelKey={level.labelKey} />;

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <div className="ohs-user-drawer__name-row">
          <h2 className="ohs-form-drawer__title">{name}</h2>
          {headerBadge}
        </div>
        <button type="button" onClick={copyId} className="ohs-user-drawer__id-chip inline-flex items-center gap-1.5">
          <span className="font-mono">{nodeId}</span>
          <RiFileCopyLine size={13} aria-hidden="true" />
          <span className="sr-only">{copied ? t('copied') : t('copy')}</span>
        </button>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={name} header={header}>
      <div className="ohs-detail-body">
        <Section icon={RiInformationLine} title={t('sectionBasicInfo')}>
          <Stack gap={4}>
            <LocationBreadcrumb root={root} selectedId={nodeId} onSelect={onSelect} />
            {physicalTypes.length > 0 ? (
              <Field label={t('locationsPhysicalType')}>
                <span className="flex flex-wrap gap-2">
                  {physicalTypes.map((p) => (
                    <PhysicalTypeChip key={p} label={p} />
                  ))}
                </span>
              </Field>
            ) : null}
            <Field label={t('locationsPartOf')}>
              {node?.partOf ? (
                <button type="button" onClick={() => onSelect(node.partOf as string)} className="text-primary hover:underline">
                  {parent?.name ?? t('locationsUnnamed', { id: node.partOf })}
                </button>
              ) : (
                <span className="text-text-muted">{t('locationsRootParent')}</span>
              )}
            </Field>
          </Stack>
        </Section>

        <Section icon={RiNodeTree} title={t('locationsChildrenCount')}>
          {partial ? (
            <div className="rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-text-muted">
              {t('locationsPartialChildrenNotice')}
            </div>
          ) : null}
          {!partial && childCount === 0 ? (
            <span className="text-text-muted">{t('detailNone')}</span>
          ) : null}
          {!partial && childCount > 0 ? (
            <ul className="m-0 flex list-none flex-col p-0">
              {node?.children.map((c) => (
                <li key={c.id} className="border-b border-border/60 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2.5 text-left text-sm hover:bg-surface-variant"
                  >
                    <span className={c.name ? 'text-text' : 'italic text-text-muted'}>
                      {c.name ?? t('locationsUnnamed', { id: c.id })}
                    </span>
                    {c.children.length > 0 || c.hasMoreChildren ? (
                      <span className="shrink-0 rounded-pill bg-surface-variant px-2 py-0.5 text-xs text-text-muted">
                        {c.children.length || '…'}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      </div>
    </Drawer>
  );
}
