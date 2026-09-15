import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * One filter chip's applied value, read from and written to the URL (`?status=active`) so filtered
 * views survive refresh and deep-link. `null` means unselected and omits the param. Values outside
 * `allowed` (a stale or hand-edited URL) read as unselected.
 */
export function useFilterParam(
  name: string,
  allowed?: readonly string[],
): [string | null, (next: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(name);
  const value = raw !== null && raw !== '' && (!allowed || allowed.includes(raw)) ? raw : null;

  const setValue = useCallback(
    (next: string | null) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === null || next === '') p.delete(name);
          else p.set(name, next);
          return p;
        },
        { replace: true },
      );
    },
    [name, setParams],
  );

  return [value, setValue];
}

/**
 * Clears several filter params in one history replace (two chip setters in a row would race).
 * Pass a module-level constant so the callback identity stays stable.
 */
export function useClearFilterParams(names: readonly string[]): () => void {
  const [, setParams] = useSearchParams();
  return useCallback(() => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const n of names) p.delete(n);
        return p;
      },
      { replace: true },
    );
  }, [names, setParams]);
}
