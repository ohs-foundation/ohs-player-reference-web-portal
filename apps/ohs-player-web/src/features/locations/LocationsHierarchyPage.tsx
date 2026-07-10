import { useMemo, useState } from 'react';
import type { Location } from '@medplum/fhirtypes';
import { RiArrowDownSLine, RiUploadCloud2Line } from '@remixicon/react';
import { PermissionGuard, useRefreshResources, useSearch, useStatusBar, useTranslation } from 'ohs-player-web-core';
import { Button, Page, PageHeader, SearchField, SelectField } from '../../components/ui';
import { collectExpandableIds, filterTree } from './expand';
import { nodeChain, type LocationNode } from './hierarchy';
import type { HierarchyError } from './useLocationHierarchy';
import { relativeTimeFrom } from './relativeTime';
import { useApplyHierarchyEdit, useLocationHierarchy, useRefreshHierarchy } from './useLocationHierarchy';
import { LocationTree } from './LocationTree';
import { LocationColumnTable } from './LocationColumnTable';
import { LocationViewToggle, type LocationView } from './LocationViewToggle';
import { LocationFilterMenu, type LocationStatusFilter } from './LocationFilterMenu';
import { LocationBreadcrumb } from './LocationBreadcrumb';
import { LocationDetailPanel } from './LocationDetailPanel';
import { LocationEditDrawer } from './LocationEditDrawer';
import { LocationImportDrawer } from './LocationImportDrawer';
import { LocationsNoAccess } from './LocationsNoAccess';
import { HierarchyEmpty, HierarchyErrorState, HierarchySkeleton, TruncatedNotice } from './LocationStates';

interface BodyArgs {
  loading: boolean;
  error: HierarchyError | null;
  tree: LocationNode | null;
  view: LocationView;
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onLoadMore: (id: string) => void;
  onRetry: () => void;
  onImport: () => void;
  onEdit: (id: string) => void;
}

function renderBody(a: BodyArgs): React.ReactElement | null {
  if (a.loading) return <HierarchySkeleton />;
  if (a.error) {
    if (a.error.status === 401 || a.error.status === 403) {
      // 401 is the intermittent gateway token bug — offer Retry before no-access.
      return <LocationsNoAccess status={a.error.status} onRetry={a.onRetry} />;
    }
    return <HierarchyErrorState error={a.error} onRetry={a.onRetry} />;
  }
  if (!a.tree) return null;
  const isEmpty = a.tree.children.length === 0 && !a.tree.hasMoreChildren;
  if (isEmpty) {
    return (
      <PermissionGuard permission="bulk-import.manage" fallback={<HierarchyEmpty />}>
        <HierarchyEmpty onImport={a.onImport} />
      </PermissionGuard>
    );
  }
  if (a.view === 'column') {
    return <LocationColumnTable root={a.tree} onSelect={a.onSelect} onEdit={a.onEdit} />;
  }
  return (
    <LocationTree
      root={a.tree}
      expanded={a.expanded}
      selectedId={a.selectedId}
      onToggle={a.onToggle}
      onSelect={a.onSelect}
      onLoadMore={a.onLoadMore}
      onEdit={a.onEdit}
    />
  );
}

function rootOptions(data: unknown, unnamed: (id: string) => string): { value: string; label: string }[] {
  const bundle = data as { entry?: { resource?: Location }[] } | undefined;
  const locs = (bundle?.entry ?? []).map((e) => e.resource).filter((r): r is Location => Boolean(r?.id));
  return locs
    .filter((l) => !l.partOf)
    .map((l) => ({ value: l.id as string, label: l.name ?? unnamed(l.id as string) }));
}

export function LocationsHierarchyPage(): React.ReactElement {
  const { t, locale } = useTranslation();
  const status = useStatusBar();
  const [rootId, setRootId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationStatusFilter>('all');
  const [view, setView] = useState<LocationView>('tree');
  const [importOpen, setImportOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // HAPI rejects partOf:missing, so root candidates are filtered client-side.
  const rootsSearch = useSearch('Location', { _count: '200' });
  const roots = useMemo(() => rootOptions(rootsSearch.data, (id) => t('locationsUnnamed', { id })), [rootsSearch.data, t]);
  const effectiveRoot = rootId || roots[0]?.value || '';

  const query = useLocationHierarchy(effectiveRoot || undefined);
  const refreshResources = useRefreshResources();
  const refreshHierarchy = useRefreshHierarchy(effectiveRoot || undefined);
  const refetch = () => {
    void query.refetch();
  };
  const applyEdit = useApplyHierarchyEdit(effectiveRoot || undefined);
  // Instant optimistic patch, then an authoritative refresh so the edit survives a reload.
  const onEditSaved = (patch: Parameters<typeof applyEdit>[0]) => {
    applyEdit(patch);
    void refreshResources('Location');
  };

  // The import bypasses TanStack mutations, so refresh both the dropdown's Location search and the tree
  // (with cache eviction) so imported roots and subtrees survive a reload.
  const onImportComplete = () => {
    void refreshResources('Location');
    void refreshHierarchy();
  };

  const select = (id: string) => {
    setSelectedId(id);
    const root = query.data?.root;
    if (!root) return;
    const ancestors = nodeChain(root, id).slice(0, -1).map((n) => n.id);
    setExpanded((prev) => new Set([...prev, ...ancestors]));
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const loadMore = (id: string) => {
    // No in-place paging — re-root on the node.
    setRootId(id);
    setSelectedId(id);
    setExpanded(new Set());
  };

  const expandAll = () => {
    if (query.data) setExpanded(collectExpandableIds(query.data.root));
  };
  const collapseAll = () => setExpanded(new Set());

  const header = (
    <PageHeader
      title={t('pageLocations')}
      description={t('pageLocationsDescription')}
      actions={
        <>
          <Button
            variant="secondary"
            type="button"
            iconRight={<RiArrowDownSLine size={20} />}
            onClick={() => status.notify({ tone: 'info', title: t('exportComingSoon') })}
          >
            {t('locationsExport')}
          </Button>
          <PermissionGuard permission="bulk-import.manage">
            <Button type="button" iconLeft={<RiUploadCloud2Line size={18} />} onClick={() => setImportOpen(true)}>
              {t('locationsImport')}
            </Button>
          </PermissionGuard>
        </>
      }
    />
  );

  const meta = query.data?.meta;
  const builtAtLabel = relativeTimeFrom(meta?.builtAt ?? null, locale);

  const displayed = useMemo(() => {
    if (!query.data) return null;
    return filterTree(query.data.root, filter, statusFilter);
  }, [query.data, filter, statusFilter]);
  const filtering = filter.trim() !== '' || statusFilter !== 'all';
  const effectiveExpanded = filtering && displayed ? displayed.expand : expanded;

  return (
    <Page>
      {header}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <SelectField
              label={t('locationsRoot')}
              value={effectiveRoot}
              options={roots}
              placeholder={t('locationsRootPlaceholder')}
              onChange={(e) => {
                setRootId(e.target.value);
                setSelectedId(null);
                setExpanded(new Set());
              }}
            />
          </div>
          <SearchField
            label={t('locationsSearch')}
            placeholder={t('locationsSearch')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-84 h-12"
          />
          <LocationFilterMenu value={statusFilter} onChange={setStatusFilter} />
        </div>
        <LocationViewToggle value={view} onChange={setView} />
      </div>

      {view === 'tree' ? (
        <div className="flex justify-end gap-2">
          <Button variant="outlined" size="sm" type="button" className="rounded-pill" onClick={collapseAll}>
            {t('locationsCollapseAll')}
          </Button>
          <Button variant="outlined" size="sm" type="button" className="rounded-pill" onClick={expandAll}>
            {t('locationsExpandAll')}
          </Button>
        </div>
      ) : null}

      {query.data ? <LocationBreadcrumb root={query.data.root} selectedId={selectedId} onSelect={select} /> : null}
      {meta?.truncated ? <TruncatedNotice nodeCount={meta.nodeCount} builtAtLabel={builtAtLabel} /> : null}

      <div className="min-h-80 overflow-auto rounded border border-border">
        {renderBody({
          loading: rootsSearch.isLoading || query.isLoading,
          error: query.isError ? query.error : null,
          tree: displayed?.tree ?? null,
          view,
          expanded: effectiveExpanded,
          selectedId,
          onToggle: toggle,
          onSelect: select,
          onLoadMore: loadMore,
          onRetry: refetch,
          onImport: () => setImportOpen(true),
          onEdit: setEditId,
        })}
      </div>

      {query.data && selectedId ? (
        <LocationDetailPanel
          root={query.data.root}
          nodeId={selectedId}
          onClose={() => setSelectedId(null)}
          onSelect={select}
          onEdit={(id) => {
            setSelectedId(null);
            setEditId(id);
          }}
        />
      ) : null}

      {editId ? (
        <LocationEditDrawer nodeId={editId} onClose={() => setEditId(null)} onSaved={onEditSaved} />
      ) : null}

      {meta ? (
        <div className="flex flex-wrap justify-between gap-2 text-sm text-text-muted">
          <span>{t('locationsFooterCount', { count: meta.nodeCount, depth: meta.depth })}</span>
          <span>{t('locationsFooterBuiltAt', { builtAt: builtAtLabel })}</span>
        </div>
      ) : null}

      <LocationImportDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={onImportComplete}
      />
    </Page>
  );
}
