import React, { forwardRef } from 'react';
import { InlineLink } from '../../types';

export function shiftInlineLinks(links: InlineLink[] | undefined, before: string, after: string): InlineLink[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length, newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  const delta = newEnd - oldEnd;
  return (links || []).flatMap(link => link.end <= start ? [link] : link.start >= oldEnd
    ? [{ ...link, start: link.start + delta, end: link.end + delta }] : []);
}

export const LinkedTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { links?: InlineLink[] }>(function LinkedTextarea({ links, ...props }, ref) {
  const text = String(props.value || '');
  const valid = (links || []).filter(link => link.start >= 0 && link.end > link.start && link.end <= text.length && /^https?:\/\//i.test(link.url)).sort((a, b) => a.start - b.start);
  if (!valid.length) return <textarea {...props} ref={ref} />;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const link of valid) {
    if (link.start < cursor) continue;
    parts.push(text.slice(cursor, link.start));
    parts.push(<a key={`${link.start}-${link.end}`} href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}
      onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      className="pointer-events-auto text-[#0563c1] underline decoration-1 underline-offset-2 hover:text-blue-800">{text.slice(link.start, link.end)}</a>);
    cursor = link.end;
  }
  parts.push(text.slice(cursor));
  return <div className="relative min-w-0 flex-1">
    <textarea {...props} ref={ref} style={{ ...props.style, color: 'transparent', WebkitTextFillColor: 'transparent', caretColor: 'var(--ui-text)' }} />
    <div data-linked-text className={`pointer-events-none absolute inset-0 whitespace-pre-wrap [overflow-wrap:anywhere] ${props.className || ''}`}>{parts}</div>
  </div>;
});
