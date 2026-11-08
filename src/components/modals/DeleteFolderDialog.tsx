import React, { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Folder } from '../../types';

export function DeleteFolderDialog({ folder, destination, noteCount, childCount, onClose, onConfirm }: {
  folder: Folder; destination: string; noteCount: number; childCount: number;
  onClose: () => void; onConfirm: () => void;
}) {
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panelRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-folder-title" aria-describedby="delete-folder-description"
      className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 id="delete-folder-title" className="font-semibold text-base flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600" />Xóa thư mục?</h2>
        <button type="button" aria-label="Đóng xác nhận xóa thư mục" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--ui-hover)]"><X className="w-4 h-4" /></button></div>
      <div id="delete-folder-description" className="space-y-2 text-sm text-[var(--ui-muted)]">
        <p>Bạn có muốn xóa thư mục <strong className="text-[var(--ui-text)]">“{folder.name}”</strong>?</p>
        <p>{noteCount} ghi chú và {childCount} thư mục con trực tiếp sẽ được chuyển đến <strong>{destination}</strong>. Nội dung bên trong được giữ lại.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" autoFocus onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--ui-hover)]">Hủy</button>
        <button type="button" onClick={() => {
          try { onConfirm(); } catch (error) { setError(error instanceof Error ? error.message : 'Không xóa được thư mục. Vui lòng thử lại.'); }
        }} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Xóa thư mục</button>
      </div>
    </div>
  </div>;
}
