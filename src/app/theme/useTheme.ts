import { useEffect, useLayoutEffect, useState } from 'react';
import { readTheme, resolveTheme, THEME_STORAGE_KEY, ThemeId } from './themes';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Selection still works for this session. */ }
  }, [theme]);
  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(resolveTheme(event.newValue));
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);
  return { theme, setTheme };
}
