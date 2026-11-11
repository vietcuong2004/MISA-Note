const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23',
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});

/** Consistent Vietnamese display time; storage timestamps stay unchanged. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  let source = value;
  if (typeof source === 'string') {
    const local = source.trim().match(/^(?:(\d{1,2}):(\d{2})\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (local) {
      const [, hour = '00', minute = '00', day, month, year] = local;
      const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (calendar.getUTCDate() !== Number(day) || calendar.getUTCMonth() + 1 !== Number(month) || Number(hour) > 23 || Number(minute) > 59) return source;
      source = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+07:00`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(source)) source += 'T00:00:00+07:00';
  }
  const date = source instanceof Date ? source : new Date(source);
  if (!Number.isFinite(date.getTime())) return typeof value === 'string' ? value : '—';
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
}
