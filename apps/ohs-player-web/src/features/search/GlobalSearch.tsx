import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'ohs-player-web-core';
import { SearchField, Spinner } from '../../components/ui';
import { useGlobalSearch } from './useGlobalSearch';

/**
 * Top-nav cross-resource search. Typing queries Users/Locations/Organisations/Care Teams in parallel
 * and shows grouped hits; selecting one navigates to that resource's list page with the term prefilled
 * (`?q=`). Submitting (Enter) without a selection goes to Users — the most common target.
 */
export function GlobalSearch(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { groups, loading, hasTerm } = useGlobalSearch(term);

  // Close the panel on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const go = (to: string): void => {
    void navigate(`${to}?q=${encodeURIComponent(term.trim())}`);
    setOpen(false);
    setTerm('');
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && hasTerm) {
      go(groups[0]?.to ?? '/users');
    }
  };

  const showPanel = open && hasTerm;

  return (
    <div className="app-search" ref={rootRef}>
      <SearchField
        size="lg"
        className="app-topbar__search"
        label={t('globalSearch')}
        placeholder={t('globalSearch')}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="app-search-results"
      />
      {showPanel ? (
        <div className="app-search__panel" id="app-search-results" role="listbox">
          {loading ? (
            <div className="app-search__status">
              <Spinner label={t('loading')} />
            </div>
          ) : groups.length === 0 ? (
            <p className="app-search__status">{t('searchNoResults')}</p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="app-search__group">
                <p className="app-search__group-title">{t(group.titleKey)}</p>
                {group.hits.map((hit) => (
                  <button
                    key={`${group.type}/${hit.id}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="app-search__hit"
                    onClick={() => go(group.to)}
                  >
                    <span className="app-search__hit-label">{hit.label}</span>
                    <span className="app-search__hit-id">{hit.id}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
