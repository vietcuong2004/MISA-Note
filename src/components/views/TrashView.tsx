import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Document } from '../../types';

interface TrashViewProps {
  documents: Document[];
  onRestore: (docId: string) => void;
  onPermanentDelete: (docId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  documents,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const trashDocs = documents.filter((d) => d.isTrash);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F5F7] p-6 md:p-10 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
              Thùng lưu trữ tạm
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
              Thùng rác
            </h1>
            <p className="text-xs text-[#6E6E73] mt-1">
              Các tài liệu đã bị xóa mềm. Bạn có thể khôi phục lại hoặc xóa vĩnh viễn.
            </p>
          </div>

          {trashDocs.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmEmpty(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D1D1F] text-white hover:bg-black text-xs font-semibold transition-colors ios-interactive self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Dọn sạch thùng rác</span>
            </button>
          )}
        </div>

        {/* Content */}
        {trashDocs.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-[20px] border border-[#E5E5EA] ios-card-shadow space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] mx-auto flex items-center justify-center text-[#86868B]">
              <Trash2 className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-semibold text-[#1D1D1F]">Thùng rác đang trống</h3>
            <p className="text-xs text-[#6E6E73] max-w-sm mx-auto">
              Không có tài liệu nào trong thùng rác. Mọi tài liệu bị xóa mềm sẽ hiển thị ở đây.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] border border-[#E5E5EA] ios-card-shadow divide-y divide-[#E5E5EA] overflow-hidden">
            {trashDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8F8FA] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-xl shrink-0">
                    {doc.icon || '📄'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#1D1D1F] truncate">
                      {doc.title || 'Không có tiêu đề'}
                    </h4>
                    <p className="text-[11px] text-[#86868B] mt-0.5 font-mono tabular-nums">
                      Xóa lúc: {doc.deletedAt ? new Date(doc.deletedAt).toLocaleString('vi-VN') : 'Gần đây'} · {doc.space === 'personal' ? 'Cá nhân' : 'Công ty'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestore(doc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D1D1D6] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-medium transition-colors ios-interactive"
                    title="Khôi phục tài liệu"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>Khôi phục</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocToDelete(doc)}
                    className="p-2 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors ios-interactive"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Single Permanent Delete */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] text-[#1D1D1F] flex items-center justify-center mx-auto border border-[#E5E5EA]">
              <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-[#1D1D1F]">Xóa vĩnh viễn tài liệu?</h3>
              <p className="text-xs text-[#6E6E73] leading-relaxed">
                Tài liệu "<span className="font-semibold text-[#1D1D1F]">{docToDelete.title}</span>" sẽ bị xóa hoàn toàn khỏi hệ thống và không thể khôi phục.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors ios-interactive"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentDelete(docToDelete.id);
                  setDocToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-[#1D1D1F] hover:bg-black shadow-xs transition-colors ios-interactive"
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
          <div className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] text-[#1D1D1F] flex items-center justify-center mx-auto border border-[#E5E5EA]">
              <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-[#1D1D1F]">Dọn sạch thùng rác?</h3>
              <p className="text-xs text-[#6E6E73] leading-relaxed">
                Toàn bộ {trashDocs.length} tài liệu trong thùng rác sẽ bị xóa vĩnh viễn ngay lập tức.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEmpty(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors ios-interactive"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmpty(false);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-[#1D1D1F] hover:bg-black shadow-xs transition-colors ios-interactive"
              >
                Xác nhận dọn sạch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
