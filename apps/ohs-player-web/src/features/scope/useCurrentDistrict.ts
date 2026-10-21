import { useCallback, useEffect, useState } from 'react';
import type { District } from './scope';

export function districtStorageKey(sub: string): string {
  return `ohs.scope.district.${sub}`;
}

function readDistrict(sub: string | undefined): string | null {
  if (!sub) return null;
  try {
    return sessionStorage.getItem(districtStorageKey(sub));
  } catch {
    return null;
  }
}

function writeDistrict(sub: string | undefined, districtId: string | null): void {
  if (!sub) return;
  try {
    if (districtId) sessionStorage.setItem(districtStorageKey(sub), districtId);
    else sessionStorage.removeItem(districtStorageKey(sub));
  } catch {
    return;
  }
}

export function useCurrentDistrict(
  sub: string | undefined,
  districts: readonly District[],
): [District | null, (districtId: string) => void] {
  const [chosenFor, setChosenFor] = useState(sub);
  const [chosen, setChosen] = useState(() => readDistrict(sub));
  if (chosenFor !== sub) {
    setChosenFor(sub);
    setChosen(readDistrict(sub));
  }

  const stale = chosen !== null && districts.length > 0 && !districts.some((d) => d.id === chosen);
  useEffect(() => {
    if (!stale) return;
    writeDistrict(sub, null);
    setChosen(null);
  }, [stale, sub]);

  const choose = useCallback(
    (districtId: string) => {
      setChosen(districtId);
      writeDistrict(sub, districtId);
    },
    [sub],
  );

  const current = districts.find((d) => d.id === chosen) ?? districts[0] ?? null;
  return [current, choose];
}
