import { useSearchParams } from 'react-router-dom';

/**
 * The `?q=` term a list page should seed its search box with — set by the top-nav global search when it
 * navigates here. Read once for the initial `useState`; the page owns the term locally after that.
 */
export function useInitialSearchTerm(): string {
  const [params] = useSearchParams();
  return params.get('q') ?? '';
}
