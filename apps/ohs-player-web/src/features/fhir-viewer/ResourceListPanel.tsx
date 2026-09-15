import { useEffect, useMemo, useState } from 'react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  usePagedSearch,
  useTranslation,
} from 'ohs-player-web-core';
import {
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  FilterChip,
  FilterChipBar,
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
import { useFilterParam, useClearFilterParams } from '../search/useFilterParam';
import { type ActiveFilter, type SincePreset, SINCE_PRESETS, sinceParam } from './filterParams';

/** HTTP statuses that mean "this backend won't serve this type" rather than a genuine failure. */
const UNSUPPORTED_STATUSES = new Set([401, 403, 404, 405, 501]);

const FILTER_PARAMS = ['status', 'lastUpdated'] as const;
const SINCE_VALUES = SINCE_PRESETS.filter((p) => p !== 'any');

const SINCE_LABEL_KEY: Record<SincePreset, string> = {
  any: 'fhirViewerSinceAny',
  '24h': 'fhirViewerSince24h',
  '7d': 'fhirViewerSince7d',
  '30d': 'fhirViewerSince30d',
};

type ErrorClass = { kind: 'unsupported' } | { kind: 'error'; message?: string } | null;

function classifyError(error: unknown): ErrorClass {
  if (!error) return null;
  if (error instanceof FhirError) {
    if (UNSUPPORTED_STATUSES.has(error.status)) return { kind: 'unsupported' };
    return {
      kind: 'error',
      message: formatOperationOutcomeMessage(error.outcome) || error.message,
    };
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
  const [statusValue, setStatusValue] = useFilterParam('status');
  const [sinceValue, setSinceValue] = useFilterParam('lastUpdated', SINCE_VALUES);
  const clearChipFilters = useClearFilterParams(FILTER_PARAMS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // The `status` param serves both facets: active/inactive for boolean-`active` types, a raw FHIR
  // status code for coded-status types.
  const active: ActiveFilter =
    statusValue === 'active' || statusValue === 'inactive' ? statusValue : 'all';
  const since: SincePreset = SINCE_PRESETS.find((p) => p === sinceValue) ?? 'any';

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusValue, sinceValue, pageSize]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (searchQuery) {
      p[def.searchParam === 'name' ? 'name:contains' : def.searchParam] = searchQuery;
    }
    if (def.statusFacet === 'active' && active !== 'all') {
      p.active = active === 'active' ? 'true' : 'false';
    }
    if (def.statusFacet === 'status' && statusValue) {
      p.status = statusValue;
    }
    const updated = sinceParam(since);
    if (updated) p._lastUpdated = updated;
    return p;
  }, [def, searchQuery, active, statusValue, since]);

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

  const hasChipFilters = statusValue !== null || sinceValue !== null;

  const placeholder = t(searchPlaceholderKey(def));
  const toolbar = (
    <div className="flex flex-wrap items-center gap-3 w-full">
      <SearchField
        label={placeholder}
        placeholder={placeholder}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      <FilterChipBar align="end" clearVisible={hasChipFilters} onClearAll={clearChipFilters}>
        {def.statusFacet === 'active' ? (
          <FilterChip
            label={t('fhirViewerFilterStatus')}
            allLabel={t('fhirViewerActive_all')}
            options={[
              { value: 'active', label: t('fhirViewerActive_active') },
              { value: 'inactive', label: t('fhirViewerActive_inactive') },
            ]}
            value={active === 'all' ? null : active}
            onChange={setStatusValue}
          />
        ) : null}
        {def.statusFacet === 'status' ? (
          <FilterChip
            variant="text"
            label={t('fhirViewerFilterStatus')}
            hint={t('fhirViewerFilterStatusHint')}
            value={statusValue}
            onChange={setStatusValue}
          />
        ) : null}
        <FilterChip
          label={t('fhirViewerFilterUpdated')}
          allLabel={t('fhirViewerSinceAny')}
          options={SINCE_VALUES.map((p) => ({ value: p, label: t(SINCE_LABEL_KEY[p]) }))}
          value={since === 'any' ? null : since}
          onChange={setSinceValue}
        />
      </FilterChipBar>
    </div>
  );

  return (
    <section
      className="flex-1 min-w-0 flex flex-col gap-5"
      aria-labelledby="fhir-viewer-panel-heading"
    >
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
            action={
              hasChipFilters ? (
                <Button variant="ghost" type="button" onClick={clearChipFilters}>
                  {t('filterClearAll')}
                </Button>
              ) : undefined
            }
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
