import { memoryStorage } from '../../utils/memoryStorage';
import { useLayoutEffect, useState } from 'react';
import { readTheme, THEME_STORAGE_KEY, ThemeId } from './themes';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { memoryStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Selection still works for this session. */ }
  }, [theme]);
  return { theme, setTheme };
}
