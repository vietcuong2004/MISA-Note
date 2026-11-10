import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, Download, File as FileIcon, RefreshCw, Upload, Video, X } from 'lucide-react';
import { Block, BlockProperties } from '../../types';
import { downloadAttachment, readAttachment, saveAttachment } from '../../utils/attachments';

export function AttachmentBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  const video = block.type === 'video';
  const audio = block.type === 'audio';
  const id = block.properties?.attachmentId;
  const url = block.properties?.url || '';
  const remote = video && /^https?:\/\//i.test(url) ? url : '';
  const [blob, setBlob] = useState<Blob | null>(null);
  const [source, setSource] = useState('');
  const [open, setOpen] = useState(!audio && !id && !remote && !readOnly);
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [link, setLink] = useState(remote);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    let localUrl = '';
    setBlob(null); setSource(''); setLoadError(''); setLoading(!!id);
    if (id) readAttachment(id).then(file => {
      if (cancelled) return;
      if (!file) throw new Error('Không tìm thấy tệp trên trình duyệt này. Vui lòng tải lên lại.');
      localUrl = URL.createObjectURL(file);
      setBlob(file); setSource(localUrl);
    }).catch(cause => { if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'Không đọc được tệp.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [id]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node) && !busy) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setOpen(false); };
    document.addEventListener('mousedown', outside); window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('keydown', escape); };
  }, [open, busy]);
  useEffect(() => { if (open && tab === 'link') linkInput.current?.focus(); }, [open, tab]);
  const upload = async (file: File) => {
    if (video && !file.type.startsWith('video/')) { setError('Vui lòng chọn tệp video.'); return; }
    if (audio && !file.type.startsWith('audio/')) { setError('Vui lòng chọn tệp âm thanh.'); return; }
    setBusy(true); setError('');
    try {
      const attachmentId = await saveAttachment(file);
      if (!mounted.current) return;
      const fileSize = file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(file.size / 1024))} KB`;
      onChange(block.content, { ...block.properties, attachmentId, fileName: file.name, fileSize, url: undefined });
      setOpen(false);
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không tải được tệp.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const download = async () => {
    setDownloading(true); setLoadError('');
    try {
      let file = blob;
      if (!file && remote) {
        const response = await fetch(remote, { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error('Download failed');
        file = await response.blob();
        if (!file.type.startsWith('video/') && file.type !== 'application/octet-stream') throw new Error('Not a video');
      }
      if (!file) throw new Error('Missing file');
      downloadAttachment(file, block.properties?.fileName || (audio ? 'audio.mp3' : 'video.mp4'));
    } catch { setLoadError('Không tải xuống được tệp. Vui lòng thử lại hoặc mở liên kết gốc.'); }
    finally { setDownloading(false); }
  };
  const label = video ? 'video' : audio ? 'âm thanh' : 'tệp';
  const currentSource = id ? source : remote;
  const ready = video ? !!currentSource : !!blob;
  const Icon = video ? Video : audio ? AudioLines : FileIcon;

  return <div ref={container} data-attachment-block={block.id} className="w-full space-y-2">
    {ready ? <figure className="space-y-2">
      <div tabIndex={0} role="group" aria-label={`Nội dung ${label} và thao tác`}
        className={`group/attachment relative mx-auto rounded-xl ${video ? 'w-fit max-w-full' : 'w-full'}`}>
        {video ? <video controls playsInline preload="metadata" src={currentSource}
          onError={() => setLoadError('Không phát được video. Hãy chọn tệp hoặc URL video trực tiếp khác.')}
          className="block max-h-[560px] max-w-full rounded-xl" />
          : audio ? <div className="space-y-2 rounded-xl bg-[var(--ui-subtle)] p-3">
            <p className="break-all text-sm text-[var(--ui-muted)]">{block.properties?.fileName}</p>
            <audio controls preload="metadata" src={currentSource} className="w-full"
              onError={() => setLoadError('Không phát được tệp âm thanh. Vui lòng chọn tệp khác.')} />
          </div> : <div className="flex min-h-20 items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-subtle)] px-4 py-4">
            <FileIcon className="h-8 w-8 shrink-0 text-[var(--ui-muted)]" />
            <div className="min-w-0"><p className="break-all text-sm font-medium">{block.properties?.fileName}</p>
              <p className="mt-1 text-xs text-[var(--ui-tertiary)]">{block.properties?.fileSize}</p></div>
          </div>}
        <div role="toolbar" aria-label={`Thao tác ${label}`}
          className="pointer-events-none absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]/95 p-1 shadow-lg opacity-0 transition-opacity group-hover/attachment:pointer-events-auto group-hover/attachment:opacity-100 group-focus-within/attachment:pointer-events-auto group-focus-within/attachment:opacity-100">
          {!readOnly && <button type="button" onClick={() => { setLink(remote); setError(''); setOpen(previous => !previous); }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-[var(--ui-hover)]"><RefreshCw className="h-3.5 w-3.5" />Thay {label}</button>}
          <button type="button" disabled={downloading} onClick={download} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-[var(--ui-hover)] disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />{downloading ? 'Đang tải...' : `Tải ${label} xuống`}</button>
        </div>
      </div>
      {readOnly ? block.content && <figcaption className="text-center text-xs text-[var(--ui-muted)]">{block.content}</figcaption>
        : <input aria-label={`Chú thích ${label}`} value={block.content} placeholder={`Chú thích ${label}...`}
          onChange={event => onChange(event.target.value, block.properties || {})} className="w-full bg-transparent py-1 text-center text-xs text-[var(--ui-muted)] outline-none" />}
    </figure> : <button type="button" disabled={readOnly || loading || busy} onClick={() => setOpen(previous => !previous)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-[var(--ui-hover)] px-4 py-3 text-left text-sm text-[var(--ui-tertiary)]">
      <Icon className={audio ? 'h-5 w-5' : 'h-4 w-4'} />{loading ? 'Đang đọc tệp...' : audio ? 'Thêm tệp âm thanh' : `Thêm ${label}`}
    </button>}
    {loadError && <p role="alert" className="text-center text-xs text-[var(--ui-muted)]">{loadError}{remote && <> <a href={remote} target="_blank" rel="noopener noreferrer" className="underline">Mở video gốc</a></>}</p>}
    {open && !readOnly && <div role="dialog" aria-label={`Chọn ${label}`} className="mx-auto w-full max-w-[540px] rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--ui-border)]">
        {video ? <div role="tablist" aria-label="Nguồn video" className="flex gap-4">
          {([{ id: 'upload', title: 'Tải lên' }, { id: 'link', title: 'Liên kết' }] as const).map(item => <button key={item.id} type="button" role="tab"
            aria-selected={tab === item.id} disabled={busy} onClick={() => { setTab(item.id); setError(''); }}
            className={`pb-2 text-xs ${tab === item.id ? 'border-b-2 border-[var(--ui-primary)]' : 'text-[var(--ui-tertiary)]'}`}>{item.title}</button>)}
        </div> : <span className="pb-2 text-xs">Tải tệp từ máy tính</span>}
        <button type="button" disabled={busy} aria-label={`Đóng chọn ${label}`} onClick={() => setOpen(false)} className="mb-2 rounded p-1 text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]"><X className="h-3.5 w-3.5" /></button>
      </div>
      {!video || tab === 'upload' ? <>
        <input ref={picker} type="file" accept={video ? 'video/*' : audio ? 'audio/*' : undefined} aria-label={`Chọn tệp ${video ? 'video' : audio ? 'âm thanh' : 'từ máy tính'}`} className="sr-only" disabled={busy}
          onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} />
        <button type="button" disabled={busy} onClick={() => picker.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--ui-border)] py-2 text-xs hover:bg-[var(--ui-hover)] disabled:opacity-50">
          <Upload className="h-3.5 w-3.5" />{busy ? 'Đang lưu tệp...' : 'Tải tệp lên'}</button>
      </> : <form className="space-y-3" onSubmit={event => {
        event.preventDefault();
        try {
          const parsed = new URL(link.trim());
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL');
          onChange(block.content, { ...block.properties, attachmentId: undefined, fileName: undefined, fileSize: undefined, url: parsed.href });
          setOpen(false); setError(''); setLoadError('');
        } catch { setError('Nhập URL video trực tiếp bắt đầu bằng https:// hoặc http://.'); }
      }}>
        <input ref={linkInput} aria-label="Liên kết video" placeholder="Dán liên kết video..." value={link} onChange={event => { setLink(event.target.value); setError(''); }}
          className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-subtle)] px-3 py-2 text-xs outline-none" />
        <button type="submit" className="mx-auto block w-full max-w-[300px] rounded-md bg-[#2383e2] px-4 py-2 text-xs text-white">Nhúng video</button>
      </form>}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>}
  </div>;
}
