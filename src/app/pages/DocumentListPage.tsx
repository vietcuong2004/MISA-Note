import React from 'react';
import { Clock, Star } from 'lucide-react';
import { Document } from '../../types';

export function DocumentListPage({ title, description, documents, favorite = false, onOpenDocument }: {
  title: string; description: string; documents: Document[]; favorite?: boolean;
  onOpenDocument: (id: string) => void;
}) {
  const Icon = favorite ? Star : Clock;
  return <div className="flex-1 overflow-y-auto bg-[var(--ui-bg)] p-8 md:p-12 space-y-6">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] flex items-center justify-center"><Icon className="w-5 h-5" strokeWidth={1.75} /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="text-xs text-[var(--ui-tertiary)]">{description}</p></div>
      </div>
      <div className="bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] divide-y divide-[var(--ui-border)] overflow-hidden ios-card-shadow">
        {!documents.length && <p className="p-8 text-center text-xs text-[var(--ui-tertiary)]">{favorite ? 'Chưa có tài liệu nào được gắn sao yêu thích.' : 'Chưa có ghi chú chưa phân loại.'}</p>}
        {documents.map(doc => <button type="button" key={doc.id} onClick={() => onOpenDocument(doc.id)}
          className="w-full text-left p-3.5 hover:bg-[var(--ui-subtle)] cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors">
          <span className="flex items-center gap-3 min-w-0"><span className="text-base">{doc.icon || '📄'}</span><span className="font-semibold truncate">{doc.title || 'Không có tiêu đề'}</span></span>
          <span className="text-[11px] text-[var(--ui-tertiary)] shrink-0">{new Date(doc.updatedAt).toLocaleDateString('vi-VN')}</span>
        </button>)}
      </div>
    </div>
  </div>;
}
