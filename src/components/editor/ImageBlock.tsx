import React, { useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon, RefreshCw, Upload, X } from 'lucide-react';
import { Block, BlockProperties } from '../../types';

export function ImageBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  const url = block.properties?.url || '';
  const [open, setOpen] = useState(!url && !readOnly);
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [link, setLink] = useState(url.startsWith('http') ? url : '');
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const reader = useRef<FileReader | null>(null);
  const safeUrl = /^https?:\/\//i.test(url) || /^data:image\/[\w+.-]+;base64,/i.test(url) ? url : '';
  useEffect(() => { setFailed(false); setDownloadError(''); }, [url]);
  useEffect(() => () => reader.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', outside); window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => { if (open && tab === 'link') linkInput.current?.focus(); }, [open, tab]);

  const apply = (source: string, fileName?: string) => {
    onChange(block.content, { ...block.properties, url: source, fileName });
    setOpen(false); setError(''); setBusy(false);
  };
  const upload = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Vui lòng chọn một tệp hình ảnh.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Chọn ảnh dưới 2 MB để lưu trong trình duyệt.'); return; }
    reader.current?.abort();
    const current = new FileReader(); reader.current = current;
    setBusy(true); setError('');
    current.onload = () => {
      if (typeof current.result === 'string') apply(current.result, file.name);
      else { setError('Không đọc được hình ảnh. Vui lòng chọn lại tệp.'); setBusy(false); }
    };
    current.onerror = () => { setError('Không đọc được hình ảnh. Vui lòng chọn lại tệp.'); setBusy(false); };
    current.onabort = () => setBusy(false);
    current.readAsDataURL(file);
  };

  const download = async () => {
    if (!safeUrl || downloading) return;
    setDownloading(true); setDownloadError('');
    try {
      const response = await fetch(safeUrl, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Not an image');
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const extension = blob.type.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      anchor.download = (block.properties?.fileName || `hinh-anh.${extension}`).replace(/[\\/:*?"<>|]/g, '_');
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setDownloadError('Không tải được ảnh. Bạn có thể mở ảnh gốc để lưu từ trình duyệt.');
    } finally { setDownloading(false); }
  };

  return <div ref={container} className="w-full space-y-2" data-image-block={block.id}>
    {safeUrl && !failed ? <figure className="space-y-2">
      <div tabIndex={0} role="group" aria-label="Hình ảnh và thao tác" className="group/image relative mx-auto w-fit max-w-full rounded-xl outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]">
        <img src={safeUrl} alt={block.content || block.properties?.fileName || 'Hình ảnh'} referrerPolicy="no-referrer"
          onError={() => setFailed(true)} className="block max-h-[560px] max-w-full rounded-xl object-contain" />
        <div role="toolbar" aria-label="Thao tác hình ảnh"
          className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]/95 p-1 shadow-lg opacity-0 transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 group-focus-within/image:pointer-events-auto group-focus-within/image:opacity-100">
          {!readOnly && <button type="button" onClick={() => { setLink(url.startsWith('http') ? url : ''); setOpen(previous => !previous); }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"><RefreshCw className="h-3.5 w-3.5" />Thay ảnh</button>}
          <button type="button" onClick={download} disabled={downloading}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--ui-text)] hover:bg-[var(--ui-hover)] disabled:opacity-50"><Download className="h-3.5 w-3.5" />{downloading ? 'Đang tải...' : 'Tải ảnh xuống'}</button>
        </div>
      </div>
      {readOnly ? block.content && <figcaption className="text-center text-xs text-[var(--ui-muted)]">{block.content}</figcaption>
        : <div><input aria-label="Chú thích ảnh" value={block.content}
          onChange={event => onChange(event.target.value, block.properties || {})} placeholder="Chú thích ảnh..."
          className="w-full min-w-0 bg-transparent py-1 text-center text-xs text-[var(--ui-muted)] outline-none" /></div>}
      {downloadError && <figcaption role="alert" className="text-center text-xs text-[var(--ui-muted)]">{downloadError}{' '}
        <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="underline">Mở ảnh gốc</a></figcaption>}
    </figure> : <button type="button" disabled={readOnly} onClick={() => setOpen(previous => !previous)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-[var(--ui-hover)] px-4 py-3 text-left text-sm text-[var(--ui-tertiary)]">
      <ImageIcon className="h-4 w-4" />{failed || (url && !safeUrl) ? 'Không tải được ảnh. Chọn ảnh khác' : 'Thêm hình ảnh'}
    </button>}
    {open && !readOnly && <div role="dialog" aria-label="Chọn hình ảnh"
      className="mx-auto w-full max-w-[540px] rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--ui-border)]">
        <div role="tablist" aria-label="Nguồn hình ảnh" className="flex gap-4">
          {([{ id: 'upload', title: 'Tải lên' }, { id: 'link', title: 'Liên kết' }] as const).map(item =>
            <button type="button" key={item.id} role="tab" aria-selected={tab === item.id}
              onClick={() => { setTab(item.id); setError(''); }}
              className={`pb-2 text-xs ${tab === item.id ? 'border-b-2 border-[var(--ui-primary)] text-[var(--ui-text)]' : 'text-[var(--ui-tertiary)]'}`}>{item.title}</button>)}
        </div>
        <button type="button" aria-label="Đóng chọn hình ảnh" onClick={() => setOpen(false)} className="mb-2 rounded p-1 text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]"><X className="h-3.5 w-3.5" /></button>
      </div>
      {tab === 'upload' ? <>
        <input ref={fileInput} type="file" accept="image/*" aria-label="Chọn tệp hình ảnh" className="sr-only" disabled={busy}
          onChange={event => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ''; }} />
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--ui-border)] py-2 text-xs hover:bg-[var(--ui-hover)] disabled:opacity-50">
          <Upload className="h-3.5 w-3.5" />{busy ? 'Đang đọc ảnh...' : 'Tải tệp lên'}
        </button>
      </> : <form className="space-y-3" onSubmit={event => {
        event.preventDefault();
        try {
          const parsed = new URL(link.trim());
          if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid URL');
          apply(parsed.href);
        } catch { setError('Nhập liên kết ảnh hợp lệ bắt đầu bằng https:// hoặc http://.'); }
      }}>
        <input ref={linkInput} aria-label="Liên kết hình ảnh" value={link} onChange={event => { setLink(event.target.value); setError(''); }}
          placeholder="Dán liên kết hình ảnh..." className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-subtle)] px-3 py-2 text-xs outline-none" />
        <button type="submit" className="mx-auto block w-full max-w-[300px] rounded-md bg-[#2383e2] px-4 py-2 text-xs text-white hover:bg-[#1b6fc2]">Nhúng hình ảnh</button>
      </form>}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>}
  </div>;
}
