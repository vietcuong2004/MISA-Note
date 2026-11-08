import React from 'react';
import { Folder, ArrowRight, X, AlertCircle } from 'lucide-react';
import { Document, Folder as FolderType, SpaceType } from '../../types';

interface ConfirmMoveDialogProps {
  isOpen: boolean;
  doc: Document | null;
  targetFolder: FolderType | null;
  targetSpace: SpaceType;
  currentLocationName: string;
  targetLocationName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmMoveDialog: React.FC<ConfirmMoveDialogProps> = ({
  isOpen,
  doc,
  targetFolder,
  targetSpace,
  currentLocationName,
  targetLocationName,
  onConfirm,
  onClose,
}) => {
  if (!isOpen || !doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center">
              <Folder className="w-4 h-4 stroke-[1.75]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--ui-text)]">Xác nhận di chuyển</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
            Bạn có chắc chắn muốn di chuyển tài liệu này sang thư mục mới không?
          </p>

          {/* Document Preview Card: file chỉ để tên file */}
          <div className="p-3.5 rounded-2xl bg-[var(--ui-subtle)] border border-[var(--ui-border)] flex items-center gap-3">
            <span className="text-xl shrink-0">{doc.icon || '📄'}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--ui-text)] truncate">{doc.title}</div>
            </div>
          </div>

          {/* Path Transition Card: phân cách bởi dấu / */}
          <div className="p-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--ui-tertiary)] block">
                  Vị trí hiện tại
                </span>
                <span className="font-medium text-[var(--ui-text)] truncate block mt-0.5">
                  {currentLocationName.replace(/ • /g, ' / ')}
                </span>
              </div>

              <div className="px-2 text-[var(--ui-tertiary)] shrink-0">
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </div>

              <div className="flex-1 min-w-0 text-right">
                <span className="text-[10px] uppercase font-bold text-[var(--ui-tertiary)] block">
                  Vị trí mới
                </span>
                <span className="font-bold text-[var(--ui-text)] truncate block mt-0.5">
                  {targetLocationName.replace(/ • /g, ' / ')}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F2F2F7] text-[11px] text-[var(--ui-tertiary)] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-tertiary)] shrink-0" />
              <span>
                Quyền truy cập sẽ được cập nhật tự động theo không gian{' '}
                <strong className="text-[var(--ui-text)]">
                  {targetSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}
                </strong>
                .
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-[var(--ui-subtle)] border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--ui-muted)] hover:text-[var(--ui-text)] rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-xl shadow-xs transition-colors ios-interactive cursor-pointer"
          >
            Xác nhận di chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
