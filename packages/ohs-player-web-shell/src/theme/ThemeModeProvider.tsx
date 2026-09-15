import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  initialThemeMode,
  THEME_STORAGE_KEY,
  type ThemeMode,
  ThemeModeContext,
} from './themeModeContext';

/** Owns the light/dark mode: persists the choice and reflects it as `data-theme` on the document root. */
export function ThemeModeProvider({ children }: Readonly<{ children: ReactNode }>): React.ReactElement {
  const [mode, setMode] = useState<ThemeMode>(initialThemeMode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}
