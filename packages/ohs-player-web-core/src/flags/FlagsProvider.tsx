import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { FlagsConfig } from '../types/config';

const FlagsContext = createContext<{
  isEnabled: (key: string) => boolean;
} | null>(null);

export function FlagsProvider({
  config,
  children,
}: {
  config: FlagsConfig | undefined;
  children: ReactNode;
}): React.ReactElement {
  const defaultValue = config?.defaultValue ?? false;
  const ref = useRef(config?.flags);
  useEffect(() => {
    ref.current = config?.flags;
  }, [config?.flags]);

  const value = useMemo(
    () => ({
      isEnabled: (key: string): boolean => {
        const flags = ref.current;
        if (flags && Object.prototype.hasOwnProperty.call(flags, key)) {
          return !!flags[key];
        }
        return defaultValue;
      },
    }),
    [defaultValue],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlag(key: string): boolean {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('FlagsProvider is required for useFlag');
  return ctx.isEnabled(key);
}
