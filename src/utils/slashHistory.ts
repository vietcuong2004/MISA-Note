import { memoryStorage } from './memoryStorage';
const KEY = 'misa_recent_slash_commands';

export function readSlashHistory(): string[] {
  try {
    const value: unknown = JSON.parse(memoryStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))].slice(0, 5) : [];
  } catch { return []; }
}

export function recordSlashCommand(id: string): string[] {
  const recent = [id, ...readSlashHistory().filter(previous => previous !== id)].slice(0, 5);
  try { memoryStorage.setItem(KEY, JSON.stringify(recent)); } catch { /* Menu actions still work when storage is unavailable. */ }
  return recent;
}
