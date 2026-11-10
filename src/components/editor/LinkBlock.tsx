import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Block, BlockProperties } from '../../types';

export function LinkBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  let saved: URL | undefined;
  try {
    const parsed = new URL(block.properties?.url || '');
    if (['http:', 'https:'].includes(parsed.protocol)) saved = parsed;
  } catch { /* An empty block shows the URL form. */ }

  if (!saved) return readOnly ? null : <form aria-label="Thêm liên kết" className="my-1.5 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3"
    onSubmit={event => {
      event.preventDefault();
      try {
        const url = new URL(draft.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid URL');
        onChange(block.content || url.hostname, { ...block.properties, url: url.href });
        setError('');
      } catch { setError('Nhập URL hợp lệ bắt đầu bằng https:// hoặc http://.'); }
    }}>
    <div className="flex items-center gap-2">
      <input autoFocus aria-label="URL trang" value={draft} placeholder="Nhập URL..."
        onChange={event => { setDraft(event.target.value); setError(''); }}
        className="min-w-0 flex-1 rounded-md border border-[var(--ui-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ui-primary)]" />
      <button type="submit" className="rounded-md bg-[#2383e2] px-4 py-2 text-sm text-white">Thêm</button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
  </form>;

  return <div className="my-1.5 flex w-full items-center justify-between rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 ios-card-shadow">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-hover)]">
        <ExternalLink className="h-5 w-5 stroke-[1.75]" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold">{block.content || saved.hostname}</div>
        <div className="truncate text-[11px] text-[var(--ui-muted)]">{saved.href}</div>
      </div>
    </div>
    <a href={saved.href} target="_blank" rel="noopener noreferrer" className="shrink-0 px-3 py-1 text-xs font-semibold hover:underline">Mở ↗</a>
  </div>;
}
