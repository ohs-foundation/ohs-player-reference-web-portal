import { useMemo, useState } from 'react';
import { IconSubdirectory } from '../../components/ui/icons';
import { useTranslation } from 'ohs-player-web-core';
import { DataTable, type DataTableColumn } from '../../components/ui';
import type { LocationNode } from './hierarchy';
import { levelFromType } from './locationLevel';
import { LocationLevelBadge } from './LocationLevelBadge';
import { LocationStatusBadge } from './locationStatus';
import { LocationRowMenu } from './LocationRowMenu';

export interface LocationColumnTableProps {
  root: LocationNode;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}

function flattenAll(root: LocationNode): LocationNode[] {
  const rows: LocationNode[] = [];
  const walk = (node: LocationNode) => {
    rows.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return rows;
}

export function LocationColumnTable({ root, onSelect, onEdit }: Readonly<LocationColumnTableProps>): React.ReactElement {
  const { t } = useTranslation();
  const rows = useMemo(() => flattenAll(root), [root]);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());

  const columns = useMemo<DataTableColumn<LocationNode>[]>(
    () => [
      {
        key: 'name',
        header: t('locationsColumnName'),
        sortable: true,
        sortValue: (r) => (r.name ?? '').toLowerCase(),
        render: (r) => (
          <span className={`font-medium ${r.name ? 'text-primary' : 'italic text-text-muted'}`}>
            {r.name ?? t('locationsUnnamed', { id: r.id })}
          </span>
        ),
      },
      {
        key: 'unit',
        header: t('locationsColumnUnit'),
        render: (r) => {
          if (r.partOf === null) return <LocationLevelBadge tone="root" labelKey="locationLevelRoot" />;
          const level = levelFromType(r.type);
          return level ? <LocationLevelBadge tone={level.tone} labelKey={level.labelKey} /> : <span className="text-text-muted">—</span>;
        },
      },
      {
        key: 'parent',
        header: t('locationsColumnParent'),
        render: (r) =>
          r.partOf ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.partOf as string);
              }}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <IconSubdirectory size={14} aria-hidden="true" className="text-text-muted" />
              {r.partOfLabel ?? t('locationsUnnamed', { id: r.partOf })}
            </button>
          ) : (
            <span className="text-text-muted">{t('locationsRootParent')}</span>
          ),
      },
      {
        key: 'status',
        header: t('columnStatus'),
        render: (r) => <LocationStatusBadge status={r.status} />,
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('rowActions')}</span>,
        align: 'right',
        width: '48px',
        render: (r) => <LocationRowMenu nodeId={r.id} onView={onSelect} onEdit={onEdit} />,
      },
    ],
    [t, onSelect, onEdit],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      selectable
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      onRowClick={(r) => onSelect(r.id)}
      pagination
      // Large country trees (thousands of rows) need bigger page sizes than the default 10/25/50.
      initialPageSize={rows.length > 100 ? 50 : 10}
      pageSizeOptions={[10, 25, 50, 100, 250]}
      caption={t('locationsTreeLabel')}
      flush
    />
  );
}
