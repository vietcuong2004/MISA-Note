import React, { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Block, Folder, SpaceType } from '../../types';
import { importDocumentFile } from '../../utils/importDocument';
import { getFolderPath } from '../../utils/folders';

interface Props {
  folders: Folder[];
  onClose: () => void;
  onImport: (title: string, blocks: Block[], space: SpaceType, folderId: string | null) => void;
}

export const ImportDocumentModal: React.FC<Props> = ({ folders, onClose, onImport }) => {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [space, setSpace] = useState<SpaceType>('personal');
  const [folderId, setFolderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const panelRef = useRef<HTMLFormElement>(null);
  useEffect(() => () => { requestRef.current++; }, []);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
        if (!controls?.length) return;
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const readFile = async (file?: File) => {
    if (!file) return;
    const request = ++requestRef.current;
    setBusy(true); setError(''); setBlocks([]); setTitle('');
    try {
      const parsed = await importDocumentFile(file);
      if (request !== requestRef.current) return;
      setTitle(parsed.title); setBlocks(parsed.blocks);
    } catch (error) {
      if (request === requestRef.current) setError(error instanceof Error ? error.message : 'Không đọc được tệp.');
    } finally { if (request === requestRef.current) setBusy(false); }
  };
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] focus:outline-none focus:border-[#86868B]';

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="import-title"
      className="bg-[var(--ui-surface)] rounded-2xl shadow-2xl border border-[var(--ui-border)] w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 space-y-4"
      onSubmit={event => {
        event.preventDefault(); if (busy || !blocks.length || !title.trim()) return;
        try { onImport(title.trim(), blocks, space, folders.some(folder => folder.id === folderId && folder.space === space) ? folderId : null); }
        catch { setError('Không lưu được tài liệu. Vui lòng thử lại.'); }
      }}>
      <div className="flex items-center justify-between">
        <h2 id="import-title" className="text-base font-semibold">Nhập tài liệu</h2>
        <button type="button" onClick={onClose} aria-label="Đóng nhập tài liệu" className="p-1.5 rounded-md hover:bg-[var(--ui-hover)]"><X className="w-5 h-5" /></button>
      </div>
      <label className="block space-y-2 text-sm">
        <span className="flex items-center gap-2"><Upload className="w-4 h-4" />Chọn tệp Markdown, TXT hoặc DOCX</span>
        <input autoFocus type="file" accept=".md,.markdown,.txt,.docx" className={inputClass}
          onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }} />
      </label>
      <p className="text-xs text-[var(--ui-muted)]">Tối đa 10 MB. Nhập nội dung văn bản, đề mục, danh sách và bảng; ảnh và bố cục Word phức tạp không được giữ.</p>
      {busy && <p role="status" className="text-sm">Đang đọc tài liệu...</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!!blocks.length && <>
        <label className="block space-y-1 text-xs"><span>Tên tài liệu</span><input required value={title} onChange={event => setTitle(event.target.value)} className={inputClass} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs"><span>Khu vực</span><select value={space} className={inputClass}
            onChange={event => { setSpace(event.target.value as SpaceType); setFolderId(''); }}>
            <option value="personal">Ghi chép của tôi</option><option value="company">Tài liệu công ty</option>
          </select></label>
          <label className="space-y-1 text-xs"><span>Thư mục</span><select value={folderId} onChange={event => setFolderId(event.target.value)} className={inputClass}>
            <option value="">Thư mục gốc</option>{folders.filter(folder => folder.space === space).map(folder => <option key={folder.id} value={folder.id}>{getFolderPath(folder.id, folders)}</option>)}
          </select></label>
        </div>
        <div className="rounded-lg bg-[var(--ui-subtle)] p-3 space-y-2">
          <p className="text-xs text-[var(--ui-muted)]">Xem trước · {blocks.length} khối nội dung</p>
          <div className="max-h-40 overflow-y-auto text-sm whitespace-pre-wrap break-words">{blocks.slice(0, 12).map(block => <p key={block.id} className="mb-2">{block.type === 'table' ? block.properties?.tableData?.headers.join(' | ') : block.content || '—'}</p>)}</div>
        </div>
      </>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--ui-hover)]">Hủy</button>
        <button type="submit" disabled={busy || !blocks.length || !title.trim()} className="px-4 py-2 text-sm rounded-lg theme-primary bg-[var(--ui-primary)] text-white disabled:opacity-40">Nhập và mở tài liệu</button>
      </div>
    </form>
  </div>;
};
