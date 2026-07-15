import { RiDeleteBinLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import { IconButton } from '../../components/ui';

export interface DraftListItem {
  id: string;
  title: string;
  meta?: string;
  /** Indent level for tree-ish location rows (0 = root). */
  depth?: number;
}

export function DraftList({
  items,
  emptyTitle,
  emptyHint,
  readOnly,
  onSelect,
  onRemove,
  selectedId,
}: Readonly<{
  items: DraftListItem[];
  emptyTitle: string;
  emptyHint?: string;
  readOnly?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  selectedId?: string | null;
}>): React.ReactElement {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="ohs-setup-draft-empty">
        <p className="ohs-setup-draft-empty__title">{emptyTitle}</p>
        {emptyHint ? <p className="ohs-setup-draft-empty__hint">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <ul className="ohs-setup-draft-list">
      {items.map((item) => {
        const depth = item.depth ?? 0;
        const selected = selectedId === item.id;
        const interactive = Boolean(onSelect) && !readOnly;
        return (
          <li
            key={item.id}
            className={[
              'ohs-setup-draft-list__item',
              selected ? 'ohs-setup-draft-list__item--selected' : '',
              interactive ? 'ohs-setup-draft-list__item--interactive' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
          >
            <button
              type="button"
              className="ohs-setup-draft-list__main"
              disabled={!interactive}
              onClick={() => onSelect?.(item.id)}
            >
              <span className="ohs-setup-draft-list__title">{item.title}</span>
              {item.meta ? <span className="ohs-setup-draft-list__meta">{item.meta}</span> : null}
            </button>
            {!readOnly && onRemove ? (
              <IconButton label={t('removeAssignment')} onClick={() => onRemove(item.id)}>
                <RiDeleteBinLine size={20} />
              </IconButton>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function StepIntro({
  text,
  count,
  countLabel,
}: Readonly<{ text: string; count: number; countLabel: string }>): React.ReactElement {
  return (
    <div className="ohs-setup-step-intro">
      <p className="ohs-setup-step-intro__text">{text}</p>
      {count > 0 ? (
        <span className="ohs-setup-step-intro__count">
          {count} {countLabel}
        </span>
      ) : null}
    </div>
  );
}
