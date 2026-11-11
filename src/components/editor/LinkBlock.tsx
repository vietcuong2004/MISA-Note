import React, { useState } from 'react';
import { Block, BlockProperties } from '../../types';

export function LinkBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  const [draft, setDraft] = useState('');
  const [displayText, setDisplayText] = useState(block.content);
  const [error, setError] = useState('');
  let saved: URL | undefined;
  try {
    const parsed = new URL(block.properties?.url || '');
    if (['http:', 'https:'].includes(parsed.protocol)) saved = parsed;
  } catch { /* An empty block shows the URL form. */ }

  if (!saved) return readOnly ? null : <form role="dialog" aria-label="Thêm liên kết" className="my-1.5 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3"
    onSubmit={event => {
      event.preventDefault();
      try {
        const url = new URL(draft.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid URL');
        onChange(displayText.trim() || url.href, { ...block.properties, url: url.href });
        setError('');
      } catch { setError('Nhập URL hợp lệ bắt đầu bằng https:// hoặc http://.'); }
    }}>
    <div className="space-y-3">
      <label className="block space-y-1.5 text-xs text-[var(--ui-muted)]">
        <span>URL</span>
        <input autoFocus aria-label="URL trang" value={draft} placeholder="Nhập URL..."
          onChange={event => { setDraft(event.target.value); setError(''); }}
          className="block w-full rounded-md border border-[var(--ui-border)] bg-transparent px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-primary)]" />
      </label>
      <label className="block space-y-1.5 text-xs text-[var(--ui-muted)]">
        <span>Nội dung hiển thị</span>
        <input aria-label="Nội dung hiển thị" value={displayText} placeholder="Nhập nội dung hiển thị..."
          onChange={event => setDisplayText(event.target.value)}
          className="block w-full rounded-md border border-[var(--ui-border)] bg-transparent px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-primary)]" />
      </label>
      <div className="flex justify-end"><button type="submit" className="rounded-md bg-[#2383e2] px-4 py-2 text-sm text-white">Thêm</button></div>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
  </form>;

  return <a href={saved.href} target="_blank" rel="noopener noreferrer" title={saved.href}
    className="inline break-words text-sm leading-6 text-[#0563c1] underline decoration-1 underline-offset-2 hover:text-blue-800">{block.content || saved.href}</a>;
}
