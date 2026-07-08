import { useMemo, useState } from 'react';
import type { Location } from '@medplum/fhirtypes';
import { RiUploadCloud2Line } from '@remixicon/react';
import { PermissionGuard, useSearch, useTranslation } from 'ohs-player-web-core';
import { Button, Page, PageHeader, SelectField } from '../../components/ui';
import { collectExpandableIds, filterTree } from './expand';
import { nodeChain, type LocationNode } from './hierarchy';
import type { HierarchyError } from './useLocationHierarchy';
import { relativeTimeFrom } from './relativeTime';
import { useLocationHierarchy } from './useLocationHierarchy';
import { LocationTree } from './LocationTree';
import { LocationBreadcrumb } from './LocationBreadcrumb';
import { LocationDetailPanel } from './LocationDetailPanel';
import { LocationImportDrawer } from './LocationImportDrawer';
import { LocationsNoAccess } from './LocationsNoAccess';
import { HierarchyEmpty, HierarchyErrorState, HierarchySkeleton, TruncatedNotice } from './LocationStates';

interface BodyArgs {
  loading: boolean;
  error: HierarchyError | null;
  tree: LocationNode | null;
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onLoadMore: (id: string) => void;
  onRetry: () => void;
  onImport: () => void;
}

/** Pick the tree body from data + error state (keeps the component's JSX flat). */
function renderBody(a: BodyArgs): React.ReactElement | null {
  if (a.loading) return <HierarchySkeleton />;
  if (a.error) {
    if (a.error.status === 401 || a.error.status === 403) return <LocationsNoAccess status={a.error.status} />;
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
  return (
    <LocationTree
      root={a.tree}
      expanded={a.expanded}
      selectedId={a.selectedId}
      onToggle={a.onToggle}
      onSelect={a.onSelect}
      onLoadMore={a.onLoadMore}
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
  const [rootId, setRootId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  // Root candidates: Locations with no partOf. (HAPI here rejects partOf:missing, so filter client-side.)
  const rootsSearch = useSearch('Location', { _count: '200' });
  const roots = useMemo(() => rootOptions(rootsSearch.data, (id) => t('locationsUnnamed', { id })), [rootsSearch.data, t]);
  const effectiveRoot = rootId || roots[0]?.value || '';

  const query = useLocationHierarchy(effectiveRoot || undefined);
  const refetch = () => {
    void query.refetch();
  };

  const select = (id: string) => {
    setSelectedId(id);
    // Expand the selected node's ancestors so it's visible in tree view.
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
    // No in-place paging (hierarchy.ts open dependency) — re-root the view to fetch that node's subtree.
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
        <PermissionGuard permission="bulk-import.manage">
          <Button type="button" iconLeft={<RiUploadCloud2Line size={18} />} onClick={() => setImportOpen(true)}>
            {t('locationsImport')}
          </Button>
        </PermissionGuard>
      }
    />
  );

  const meta = query.data?.meta;
  const builtAtLabel = relativeTimeFrom(meta?.builtAt ?? null, locale);

  // Apply the client-side name filter to the loaded tree; filtered matches force-expand their ancestors.
  const displayed = useMemo(() => {
    if (!query.data) return null;
    return filterTree(query.data.root, filter);
  }, [query.data, filter]);
  const effectiveExpanded = filter.trim() && displayed ? displayed.expand : expanded;

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
          <input
            type="search"
            aria-label={t('locationsFilter')}
            placeholder={t('locationsFilter')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 rounded-sm border border-border bg-surface px-3 text-base text-text outline-none focus:border-text-muted"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outlined" type="button" onClick={expandAll}>
            {t('locationsExpandAll')}
          </Button>
          <Button variant="outlined" type="button" onClick={collapseAll}>
            {t('locationsCollapseAll')}
          </Button>
        </div>
      </div>

      {query.data ? <LocationBreadcrumb root={query.data.root} selectedId={selectedId} onSelect={select} /> : null}
      {meta?.truncated ? <TruncatedNotice nodeCount={meta.nodeCount} builtAtLabel={builtAtLabel} /> : null}

      <div className="min-h-80 overflow-auto rounded border border-border">
        {renderBody({
          loading: rootsSearch.isLoading || query.isLoading,
          error: query.isError ? query.error : null,
          tree: displayed?.tree ?? null,
          expanded: effectiveExpanded,
          selectedId,
          onToggle: toggle,
          onSelect: select,
          onLoadMore: loadMore,
          onRetry: refetch,
          onImport: () => setImportOpen(true),
        })}
      </div>

      {query.data && selectedId ? (
        <LocationDetailPanel root={query.data.root} nodeId={selectedId} onClose={() => setSelectedId(null)} onSelect={select} />
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
        onComplete={refetch}
      />
    </Page>
  );
}
