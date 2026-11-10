import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { Document } from '../../types';
import { documentUrl } from '../../app/router/routes';

export function DocumentLinkField({ documentId }: { documentId: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const url = documentUrl(window.location.origin, documentId);

  const copy = async () => {
    setCopied(false);
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      input.current?.focus();
      input.current?.select();
      setError('Không thể sao chép tự động. Nhấn Ctrl+C để sao chép liên kết đã chọn.');
    }
  };

  return <div className="space-y-2">
    <label className="block text-xs font-semibold text-[var(--ui-text)]">
      Liên kết tài liệu
      <input ref={input} readOnly value={url} onFocus={event => event.currentTarget.select()}
        className="mt-2 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-subtle)] px-3 py-2 text-xs font-normal" />
    </label>
    <button type="button" onClick={copy}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold theme-primary bg-[var(--ui-primary)] text-white">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
    </button>
    <p role="status" className="text-xs text-[var(--ui-muted)]">{error || (copied ? 'Đã sao chép liên kết tài liệu.' : '')}</p>
  </div>;
}

export function DocumentLinkShare({ document, onClose }: { document: Document; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = window.document.activeElement as HTMLElement | null;
    dialog.current?.querySelector('input')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Chia sẻ tài liệu"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const items = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button,input'));
          const first = items[0]; const last = items[items.length - 1];
          if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last.focus(); }
          if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}
      className="w-full max-w-md rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-xl space-y-4 text-[var(--ui-text)]">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Chia sẻ</h2><p className="text-xs mt-1 break-words">{document.title || 'Không có tiêu đề'}</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng chia sẻ" className="p-1 rounded-lg hover:bg-[var(--ui-hover)]"><X className="w-4 h-4" /></button>
      </div>
      <DocumentLinkField key={document.id} documentId={document.id} />
    </div>
  </div>;
}
