import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { LibraryView } from '../../components/views/LibraryView';
import { Document, Folder } from '../../types';

interface TrashPageProps {
  documents: Document[];
  folders?: Folder[];
  onRestore: (docId: string) => void;
  onPermanentDelete: (docId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashPage: React.FC<TrashPageProps> = ({
  documents,
  folders = [],
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const trashDocs = documents.filter((d) => d.isTrash);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  return (
    <>
      <LibraryView title="Thùng rác" description="Các tài liệu đã xóa. Khôi phục hoặc xóa vĩnh viễn tài liệu tại đây."
        documents={documents} folders={folders} trashMode showTabs={true}
        onOpenDocument={() => {}} onToggleFavorite={() => {}} onRestore={onRestore}
        onSoftDeleteDocument={id => setDocToDelete(trashDocs.find(doc => doc.id === id) || null)}
        headerAction={trashDocs.length > 0 && <button type="button" onClick={() => setConfirmEmpty(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl theme-primary bg-[var(--ui-primary)] text-white text-xs font-semibold shrink-0">
          <Trash2 className="w-3.5 h-3.5" />Dọn sạch thùng rác
        </button>} />

      {/* Confirmation Modal for Single Permanent Delete */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
          <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[var(--ui-hover)] text-[var(--ui-text)] flex items-center justify-center mx-auto border border-[var(--ui-border)]">
              <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-[var(--ui-text)]">Xóa vĩnh viễn tài liệu?</h3>
              <p className="text-xs text-[var(--ui-muted)] leading-relaxed">
                Tài liệu "<span className="font-semibold text-[var(--ui-text)]">{docToDelete.title}</span>" sẽ bị xóa hoàn toàn khỏi hệ thống và không thể khôi phục.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors ios-interactive"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentDelete(docToDelete.id);
                  setDocToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] shadow-xs transition-colors ios-interactive"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      {confirmEmpty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
          <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[var(--ui-hover)] text-[var(--ui-text)] flex items-center justify-center mx-auto border border-[var(--ui-border)]">
              <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-[var(--ui-text)]">Dọn sạch thùng rác?</h3>
              <p className="text-xs text-[var(--ui-muted)] leading-relaxed">
                Toàn bộ {trashDocs.length} tài liệu trong thùng rác sẽ bị xóa vĩnh viễn ngay lập tức.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEmpty(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors ios-interactive"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmpty(false);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] shadow-xs transition-colors ios-interactive"
              >
                Xác nhận dọn sạch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
