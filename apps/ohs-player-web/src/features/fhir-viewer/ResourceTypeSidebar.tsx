import { useMemo, useState } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { SearchField } from '../../components/ui';
import { RESOURCE_TYPE_DEFS } from './registry';
import { cn } from '../../lib/cn';

interface ResourceTypeSidebarProps {
  selected: string;
  onSelect: (resourceType: string) => void;
}

/** Left rail: a client-side filter over the 34 registry labels + the selectable type list. */
export function ResourceTypeSidebar({
  selected,
  onSelect,
}: Readonly<ResourceTypeSidebarProps>): React.ReactElement {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RESOURCE_TYPE_DEFS;
    return RESOURCE_TYPE_DEFS.filter((def) => t(def.labelKey).toLowerCase().includes(q));
  }, [query, t]);

  return (
    <nav
      aria-label={t('fhirViewerResourcesNav')}
      className="w-full md:w-[248px] md:shrink-0 flex flex-col gap-4"
    >
      <SearchField
        label={t('fhirViewerSearchResources')}
        placeholder={t('fhirViewerSearchResources')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full"
      />
      <ul role="list" className="flex flex-col gap-1 m-0 p-0 list-none">
        {filtered.map((def) => {
          const isActive = def.resourceType === selected;
          return (
            <li key={def.resourceType}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(def.resourceType)}
                className={cn(
                  'w-full text-left rounded px-4 py-2.5 text-sm/5 cursor-pointer',
                  'border border-transparent transition-colors duration-[120ms]',
                  isActive
                    ? 'bg-surface-variant text-text font-medium'
                    : 'bg-transparent text-text-muted hover:bg-surface-variant hover:text-text',
                )}
              >
                {t(def.labelKey)}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li role="status" className="px-4 py-2.5 text-sm text-text-muted">
            {t('fhirViewerNoTypeMatches')}
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
