import { IconChevronRight } from '../../components/ui/icons';
import { useTranslation } from 'ohs-player-web-core';
import { nodeChain, type LocationNode } from './hierarchy';

export interface LocationBreadcrumbProps {
  root: LocationNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LocationBreadcrumb({ root, selectedId, onSelect }: Readonly<LocationBreadcrumbProps>): React.ReactElement | null {
  const { t } = useTranslation();
  if (!selectedId) return null;
  const chain = nodeChain(root, selectedId);
  if (chain.length === 0) return null;

  return (
    <nav aria-label={t('breadcrumbLocations')} className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
      {chain.map((node, i) => {
        const last = i === chain.length - 1;
        const label = node.name ?? t('locationsUnnamed', { id: node.id });
        return (
          <span key={node.id} className="flex items-center gap-1">
            {i > 0 ? <IconChevronRight size={14} aria-hidden="true" className="opacity-60" /> : null}
            {last ? (
              <span aria-current="page" className="text-text">{label}</span>
            ) : (
              <button type="button" onClick={() => onSelect(node.id)} className="hover:text-text hover:underline">
                {label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
