export function listLevel(item: { level?: number }): number {
  return Number.isFinite(item.level) ? Math.max(1, Math.min(4, Math.trunc(item.level!))) : 1;
}

export function listNumbers(items: { level?: number }[]): string[] {
  const counters = [0, 0, 0, 0];
  return items.map(item => {
    const index = listLevel(item) - 1;
    for (let parent = 0; parent < index; parent++) counters[parent] ||= 1;
    counters[index]++;
    counters.fill(0, index + 1);
    return counters.slice(0, index + 1).join('.');
  });
}
