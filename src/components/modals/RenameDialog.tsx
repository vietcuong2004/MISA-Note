import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function RenameDialog({ kind, initialName, onSave, onClose }: {
  kind: 'folder' | 'document';
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const label = kind === 'folder' ? 'thư mục' : 'ghi chú';
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const input = container.current?.querySelector('input');
    input?.focus(); input?.select();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={container} role="dialog" aria-modal="true" aria-label={`Đặt lại tên ${label}`}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const items = Array.from(container.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input'));
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      className="bg-[var(--ui-surface)] rounded-[24px] shadow-2xl border border-[var(--ui-border)] w-full max-w-[400px] p-6 text-[var(--ui-text)]">
      <div className="flex items-start justify-between">
        <div><h3 className="text-[17px] font-bold">Đặt lại tên {label}</h3>
          <p className="text-sm text-[var(--ui-tertiary)] mt-0.5">Ngắn gọn và dễ nhận ra</p></div>
        <button type="button" aria-label={`Đóng ${label}`} onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ui-hover)]"><X className="w-4 h-4" /></button>
      </div>
      <form className="mt-5 space-y-4" onSubmit={event => {
        event.preventDefault();
        if (!name.trim()) return;
        try { onSave(name.trim()); onClose(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được tên mới.'); }
      }}>
        <input id={kind === 'folder' ? 'folder-name' : 'document-name'} aria-label={`Tên ${label}`} value={name} onChange={event => { setName(event.target.value); setError(''); }}
          className="w-full px-3.5 py-2.5 text-sm bg-[var(--ui-surface)] border border-[#007AFF] ring-1 ring-[#007AFF] rounded-xl outline-none" />
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button type="button" onClick={onClose} className="px-5 py-1.5 text-sm rounded-full border border-[var(--ui-border)] hover:bg-[var(--ui-hover)]">Huỷ</button>
          <button type="submit" disabled={!name.trim()} className="px-5 py-1.5 text-sm font-semibold rounded-full theme-primary bg-[var(--ui-primary)] text-white disabled:opacity-30">Lưu</button>
        </div>
      </form>
    </div>
  </div>;
}
