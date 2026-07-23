import { useEffect, useMemo, useState } from 'react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  usePagedSearch,
  useTranslation,
} from 'ohs-player-web-core';
import { RiFilter3Line } from '@remixicon/react';
import {
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  SearchField,
  StatusBadge,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { exampleFor } from './examples';
import {
  type FhirRecord,
  type ResourceTypeDef,
  displayNameFor,
  searchPlaceholderKey,
} from './registry';
import { ResourcePager } from './ResourcePager';
import { ResourceFilterPanel } from './ResourceFilterPanel';
import { type ActiveFilter, type SincePreset, sinceParam } from './filterParams';

/** HTTP statuses that mean "this backend won't serve this type" rather than a genuine failure. */
const UNSUPPORTED_STATUSES = new Set([401, 403, 404, 405, 501]);

type ErrorClass = { kind: 'unsupported' } | { kind: 'error'; message?: string } | null;

function classifyError(error: unknown): ErrorClass {
  if (!error) return null;
  if (error instanceof FhirError) {
    if (UNSUPPORTED_STATUSES.has(error.status)) return { kind: 'unsupported' };
    return { kind: 'error', message: formatOperationOutcomeMessage(error.outcome) || error.message };
  }
  return { kind: 'error', message: error instanceof Error ? error.message : undefined };
}

interface ResourceListPanelProps {
  def: ResourceTypeDef;
  onOpenResource: (resource: FhirRecord) => void;
  /** Opens the read-only example placeholder shown while a type has no stored resources. */
  onOpenExample: (resource: FhirRecord) => void;
}

/**
 * Registry-driven list for one FHIR type: ID + Name table, per-type search + filter, server
 * pagination via `usePagedSearch`, and the loading / empty / gateway-unsupported / error states.
 * Renders real rows for seeded types and a proper empty state for the rest — never crashes.
 */
export function ResourceListPanel({
  def,
  onOpenResource,
  onOpenExample,
}: Readonly<ResourceListPanelProps>): React.ReactElement {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [active, setActive] = useState<ActiveFilter>('all');
  const [statusText, setStatusText] = useState('');
  const [since, setSince] = useState<SincePreset>('any');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, active, statusText, since, pageSize]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (searchQuery) {
      p[def.searchParam === 'name' ? 'name:contains' : def.searchParam] = searchQuery;
    }
    if (def.statusFacet === 'active' && active !== 'all') {
      p.active = active === 'active' ? 'true' : 'false';
    }
    if (def.statusFacet === 'status' && statusText.trim()) {
      p.status = statusText.trim();
    }
    const updated = sinceParam(since);
    if (updated) p._lastUpdated = updated;
    return p;
  }, [def, searchQuery, active, statusText, since]);

  const { rows, total, hasNext, hasPrev, paginationMode, isLoading, error } =
    usePagedSearch<FhirRecord>(def.resourceType, { page, pageSize, params });

  const classified = classifyError(error);
  const typeLabel = t(def.labelKey);

  // No stored resources → show a single read-only example row so the type still teaches its shape.
  // It vanishes on its own the moment the server returns a real row.
  const example = exampleFor(def.resourceType);
  const showExample = !classified && !isLoading && rows.length === 0 && example !== undefined;
  const tableRows: readonly FhirRecord[] = showExample && example ? [example] : rows;

  const columns: readonly DataTableColumn<FhirRecord>[] = useMemo(
    () => [
      {
        key: 'id',
        header: t('fhirViewerColumnId'),
        width: '42%',
        render: (r) => (
          <span
            className={cn(
              'font-mono text-sm break-all text-text-muted',
              showExample && 'italic opacity-70',
            )}
          >
            {typeof r.id === 'string' ? r.id : ''}
          </span>
        ),
      },
      {
        key: 'name',
        header: t('fhirViewerColumnName'),
        render: (r) =>
          showExample ? (
            <span className="inline-flex items-center gap-2">
              <button
                type="button"
                className="text-left text-text-muted italic hover:underline"
                onClick={() => onOpenExample(r)}
              >
                {displayNameFor(def, r)}
              </button>
              <StatusBadge tone="info">{t('fhirViewerExampleBadge')}</StatusBadge>
            </span>
          ) : (
            <button
              type="button"
              className="text-left text-primary hover:underline font-medium"
              onClick={() => onOpenResource(r)}
            >
              {displayNameFor(def, r)}
            </button>
          ),
      },
    ],
    [def, t, onOpenResource, onOpenExample, showExample],
  );

  const errorNode =
    classified?.kind === 'unsupported' ? (
      <EmptyState
        title={t('fhirViewerUnsupportedTitle')}
        description={t('fhirViewerUnsupportedDescription')}
      />
    ) : classified?.kind === 'error' ? (
      <ErrorState description={classified.message ?? t('fhirViewerErrorDescription')} />
    ) : undefined;

  const clearFilters = (): void => {
    setActive('all');
    setStatusText('');
    setSince('any');
  };

  const placeholder = t(searchPlaceholderKey(def));
  const toolbar = (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          label={placeholder}
          placeholder={placeholder}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button
          variant={filtersOpen ? 'primary' : 'outlined'}
          iconLeft={<RiFilter3Line size={16} />}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {t('fhirViewerFilter')}
        </Button>
      </div>
      {filtersOpen ? (
        <ResourceFilterPanel
          def={def}
          active={active}
          onActive={setActive}
          statusText={statusText}
          onStatusText={setStatusText}
          since={since}
          onSince={setSince}
          onClear={clearFilters}
        />
      ) : null}
    </div>
  );

  return (
    <section className="flex-1 min-w-0 flex flex-col gap-5" aria-labelledby="fhir-viewer-panel-heading">
      <h3 id="fhir-viewer-panel-heading" className="m-0 text-2xl font-medium text-text">
        {t('fhirViewerTypeResources', { type: typeLabel })}
      </h3>
      <DataTable<FhirRecord>
        columns={columns}
        rows={tableRows}
        rowKey={(r) => (typeof r.id === 'string' ? r.id : displayNameFor(def, r))}
        loading={isLoading}
        toolbar={toolbar}
        caption={showExample ? t('fhirViewerExampleNote', { type: typeLabel }) : undefined}
        emptyState={
          <EmptyState
            title={t('fhirViewerEmptyTitle', { type: typeLabel })}
            description={t('fhirViewerEmptyDescription', { type: typeLabel })}
          />
        }
        errorState={errorNode}
      />
      {!classified && rows.length > 0 ? (
        <ResourcePager
          page={page}
          pageSize={pageSize}
          total={total}
          rowsOnPage={rows.length}
          hasNext={hasNext}
          hasPrev={hasPrev}
          mode={paginationMode}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      ) : null}
    </section>
  );
}
