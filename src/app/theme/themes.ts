export const THEME_STORAGE_KEY = 'misa_ui_theme';
export const THEMES = [
  { id: 'default', name: 'Mặc định', description: 'Màu sắc và bố cục hiện tại', colors: ['#1F59B6', '#FAFAFA', '#1D1D1F'] },
  { id: 'blue-yellow', name: 'Giao diện 1', description: 'Blue & Yellow · Xanh và vàng', colors: ['#285CE6', '#EFF5FF', '#F2C94C'] },
  { id: 'graphite-champagne', name: 'Giao diện 2', description: 'Graphite & Champagne · Đen và vàng', colors: ['#252A2E', '#F5F3EF', '#E5C581'] },
] as const;
export type ThemeId = typeof THEMES[number]['id'];
export const resolveTheme = (value: string | null): ThemeId => THEMES.find(theme => theme.id === value)?.id || 'default';

export function readTheme(): ThemeId {
  try { return resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return 'default'; }
}
