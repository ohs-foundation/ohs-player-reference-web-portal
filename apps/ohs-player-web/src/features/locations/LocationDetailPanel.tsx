import { useState } from 'react';
import { RiBuilding2Line, RiCloseLine, RiFileCopyLine, RiInformationLine, RiNodeTree } from '@remixicon/react';
import { OhsTabs, PermissionGuard, useResource, useTranslation } from 'ohs-player-web-core';
import type { Location, Organization } from '@medplum/fhirtypes';
import { Button, Drawer, IconButton } from '../../components/ui';
import { Section } from '../users/userFormControls';
import { LOCATION_SOURCE_ID_SYSTEM } from '../sdc/resourceFromAnswers';
import { bareId, findNode, type LocationNode } from './hierarchy';
import { levelFromType, physicalTypesFromConcept } from './locationLevel';
import { LocationStatusBadge } from './locationStatus';

export interface LocationDetailPanelProps {
  root: LocationNode;
  nodeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}

function Field({ label, children }: Readonly<{ label: string; children?: React.ReactNode }>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{children ?? '-'}</span>
    </div>
  );
}

/** address.text or the joined lines — the two shapes the backend writes. */
function addressText(resource: Location | undefined): string | null {
  if (!resource?.address) return null;
  return resource.address.text ?? resource.address.line?.join(', ') ?? null;
}

function ParentLink({
  node,
  parentLabel,
  onSelect,
}: Readonly<{ node: LocationNode | undefined; parentLabel: string | null | undefined; onSelect: (id: string) => void }>): React.ReactElement | null {
  const { t } = useTranslation();
  if (node?.partOf === null) return <span className="text-text-muted">{t('locationsRootParent')}</span>;
  if (!node?.partOf) return null;
  return (
    <button type="button" onClick={() => onSelect(node.partOf as string)} className="text-primary hover:underline">
      {parentLabel}
    </button>
  );
}

function ChildChips({
  node,
  onSelect,
}: Readonly<{ node: LocationNode | undefined; onSelect: (id: string) => void }>): React.ReactElement {
  const { t } = useTranslation();
  const children = node?.children ?? [];
  if (children.length === 0) {
    if (node?.hasMoreChildren) return <></>;
    return <span className="text-text-muted">{t('detailNone')}</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {children.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="ohs-state-layer inline-flex items-center rounded-pill border border-border px-3 py-1.5 text-sm text-primary"
        >
          {c.name ?? t('locationsUnnamed', { id: c.id })}
        </button>
      ))}
    </div>
  );
}

const TAB_TRIGGER =
  'border-b-2 border-transparent pb-2.5 text-sm font-medium text-text-muted transition-colors ' +
  'hover:text-text data-[state=active]:border-primary data-[state=active]:text-primary';

export function LocationDetailPanel({
  root,
  nodeId,
  onClose,
  onSelect,
  onEdit,
}: Readonly<LocationDetailPanelProps>): React.ReactElement {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const node = findNode(root, nodeId);
  const read = useResource('Location', nodeId);
  const resource = read.data as Location | undefined;

  const orgRef = resource?.managingOrganization;
  const orgId = bareId(orgRef?.reference);
  const orgRead = useResource('Organization', orgId ?? undefined);
  const orgName = (orgRead.data as Organization | undefined)?.name ?? orgRef?.display ?? orgId;

  const name = resource?.name ?? node?.name ?? t('locationsUnnamed', { id: nodeId });
  const status = resource?.status ?? node?.status ?? null;
  const level = node ? levelFromType(node.type) : null;
  const physicalTypes = physicalTypesFromConcept(node?.physicalType ?? resource?.physicalType);
  const sourceId = resource?.identifier?.find((i) => i.system === LOCATION_SOURCE_ID_SYSTEM)?.value;
  const parentLabel = node?.partOfLabel ?? resource?.partOf?.display ?? node?.partOf;
  const fhirJson = resource ? JSON.stringify(resource, null, 2) : null;

  const copyText = (text: string): void => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <div className="ohs-user-drawer__name-row">
          <h2 className="ohs-form-drawer__title">{name}</h2>
          <LocationStatusBadge status={status} />
        </div>
        <button
          type="button"
          onClick={() => copyText(sourceId ?? nodeId)}
          className="ohs-user-drawer__id-chip inline-flex items-center gap-1.5"
        >
          <span className="font-mono">{sourceId ?? nodeId}</span>
          <RiFileCopyLine size={13} aria-hidden="true" />
          <span className="sr-only">{copied ? t('copied') : t('copy')}</span>
        </button>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  // No Deactivate: the hierarchy cache can't reflect a status write; restore when the backend can.
  const footer = (
    <div className="ohs-user-drawer__foot">
      <PermissionGuard permission="locations.edit">
        <Button type="button" style={{ marginLeft: 'auto' }} onClick={() => onEdit(nodeId)}>
          {t('editDetails')}
        </Button>
      </PermissionGuard>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={name} header={header} footer={footer}>
      <OhsTabs.Root defaultValue="info">
        <OhsTabs.List className="flex gap-6 border-b border-border px-6 pt-2" aria-label={t('locationsDetailTitle')}>
          <OhsTabs.Trigger value="info" className={TAB_TRIGGER}>
            {t('locationsTabInfo')}
          </OhsTabs.Trigger>
          <OhsTabs.Trigger value="fhir" className={TAB_TRIGGER}>
            {t('locationsTabFhir')}
          </OhsTabs.Trigger>
        </OhsTabs.List>

        <OhsTabs.Content value="info">
          <div className="ohs-detail-body">
            <Section icon={RiInformationLine} title={t('sectionBasicInfo')}>
              <div className="ohs-detail-grid">
                <Field label={t('locationName')}>{name}</Field>
                <Field label={t('columnStatus')}>{status ? <LocationStatusBadge status={status} /> : null}</Field>
                <Field label={t('locationsAddressLine')}>{addressText(resource)}</Field>
                <Field label={t('locationsMode')}>
                  {resource?.mode ? <span className="capitalize">{resource.mode}</span> : null}
                </Field>
                <Field label={t('locationsAdminLevel')}>{level ? t(level.labelKey) : null}</Field>
                <Field label={t('locationsParentLocation')}>
                  <ParentLink node={node} parentLabel={parentLabel} onSelect={onSelect} />
                </Field>
                <Field label={t('locationsLatitude')}>
                  {resource?.position?.latitude !== undefined ? String(resource.position.latitude) : null}
                </Field>
                <Field label={t('locationsLongitude')}>
                  {resource?.position?.longitude !== undefined ? String(resource.position.longitude) : null}
                </Field>
                <Field label={t('locationsPhysicalType')}>
                  {physicalTypes.length > 0 ? physicalTypes.join(', ') : null}
                </Field>
                <Field label={t('locationsSourceId')}>{sourceId}</Field>
              </div>
            </Section>

            {orgRef ? (
              <Section icon={RiBuilding2Line} title={t('locationsManagingOrg')}>
                <span className="inline-flex items-center rounded-pill border border-border px-3 py-1.5 text-sm text-primary">
                  {orgName}
                </span>
              </Section>
            ) : null}

            <Section icon={RiNodeTree} title={t('locationsChildrenCount')}>
              {node?.hasMoreChildren ? (
                <div className="mb-3 rounded border border-border-tertiary bg-surface-variant p-3 text-sm text-text-muted">
                  {t('locationsPartialChildrenNotice')}
                </div>
              ) : null}
              <ChildChips node={node} onSelect={onSelect} />
            </Section>
          </div>
        </OhsTabs.Content>

        <OhsTabs.Content value="fhir">
          <div className="ohs-detail-body">
            <div className="mb-3 flex justify-end">
              <Button
                variant="outlined"
                type="button"
                iconLeft={<RiFileCopyLine size={16} />}
                disabled={!fhirJson}
                onClick={() => fhirJson && copyText(fhirJson)}
              >
                {copied ? t('copied') : t('locationsCopyCode')}
              </Button>
            </div>
            <pre className="m-0 overflow-auto rounded bg-surface-variant p-4 text-xs leading-relaxed text-text">
              {fhirJson ?? t('loading')}
            </pre>
          </div>
        </OhsTabs.Content>
      </OhsTabs.Root>
    </Drawer>
  );
}
