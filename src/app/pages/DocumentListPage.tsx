import React from 'react';
import { Clock, FileText, GripVertical, Star } from 'lucide-react';
import { Document } from '../../types';
import { clearActiveDrag, setDragDocument, useActiveDrag } from '../../utils/dnd';

export function DocumentListPage({
  title,
  description,
  documents,
  favorite = false,
  emptyMessage,
  onOpenDocument,
}: {
  title: string;
  description: string;
  documents: Document[];
  favorite?: boolean;
  emptyMessage?: string;
  onOpenDocument: (id: string) => void;
}) {
  const Icon = favorite ? Star : Clock;
  const { isDraggingDocument, draggedId } = useActiveDrag();

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ui-bg)] p-8 md:p-12 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text)]">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">{title}</h1>
              <p className="text-xs text-[var(--ui-tertiary)]">{description}</p>
            </div>
          </div>
          {documents.length > 0 && (
            <span className="text-xs text-[var(--ui-tertiary)] bg-[var(--ui-surface)] px-2.5 py-1 rounded-full border border-[var(--ui-border)] font-medium">
              {documents.length} tài liệu
            </span>
          )}
        </div>

        {documents.length > 0 && (
          <div className="p-3 bg-[var(--ui-primary)]/5 border border-[var(--ui-primary)]/20 rounded-xl text-xs text-[var(--ui-text)] flex items-center gap-2">
            <span className="text-sm">💡</span>
            <span>
              <strong>Mẹo sắp xếp:</strong> Bạn có thể nhấn giữ và kéo thả tài liệu vào các thư mục ở thanh bên trái để phân loại nhanh.
            </span>
          </div>
        )}

        <div className="bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] divide-y divide-[var(--ui-border)] overflow-hidden ios-card-shadow">
          {!documents.length && (
            <p className="p-8 text-center text-xs text-[var(--ui-tertiary)]">
              {emptyMessage ?? (favorite
                ? 'Chưa có tài liệu nào được gắn sao yêu thích.'
                : 'Chưa có ghi chú chưa phân loại.')}
            </p>
          )}
          {documents.map((doc) => {
            const isBeingDragged = isDraggingDocument && draggedId === doc.id;

            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => {
                  setDragDocument(e, doc.id);
                }}
                onDragEnd={() => {
                  clearActiveDrag();
                }}
                onClick={() => onOpenDocument(doc.id)}
                className={`group w-full text-left p-3.5 hover:bg-[var(--ui-subtle)] cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 text-xs transition-all select-none ${
                  isBeingDragged
                    ? 'opacity-40 scale-[0.98] border border-dashed border-[var(--ui-primary)] bg-[var(--ui-hover)]'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0" title="Kéo thả vào thư mục ở thanh bên">
                    <GripVertical
                      className="w-3.5 h-3.5 text-[var(--ui-tertiary)] opacity-0 group-hover:opacity-70 transition-opacity"
                    />
                  </span>
                  <FileText className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)] shrink-0" />
                  <span className="font-semibold truncate text-[var(--ui-text)] group-hover:text-[var(--ui-primary)] transition-colors">
                    {doc.title || 'Không có tiêu đề'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-[var(--ui-tertiary)]">
                    {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
