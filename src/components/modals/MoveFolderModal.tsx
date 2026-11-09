import React, { useState, useEffect } from 'react';
import { X, Folder as FolderIcon, User, Building2, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { Folder, SpaceType } from '../../types';
import { getFolderAncestors, getFolderPath } from '../../utils/folders';

interface MoveFolderModalProps {
  folder: Folder | null;
  folders: Folder[];
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string, targetParentId: string | null, targetSpace: SpaceType) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const MoveFolderModal: React.FC<MoveFolderModalProps> = ({
  folder,
  folders,
  isOpen,
  onClose,
  onMove,
  onToast,
}) => {
  const [selectedSpace, setSelectedSpace] = useState<SpaceType>('personal');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && folder) {
      setSelectedSpace(folder.space);
      setSelectedParentId(folder.parentId || null);
    }
  }, [isOpen, folder]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !folder) return null;

  // Collect descendants of the folder to prevent circular nesting
  const descendantIds = new Set<string>();
  const collectDescendants = (parentId: string) => {
    folders
      .filter((f) => f.parentId === parentId)
      .forEach((f) => {
        descendantIds.add(f.id);
        collectDescendants(f.id);
      });
  };
  collectDescendants(folder.id);

  // Filter allowed target folders in selected space (cannot be self or descendant)
  const allowedFolders = folders.filter(
    (f) => f.space === selectedSpace && f.id !== folder.id && !descendantIds.has(f.id)
  );

  const handleSpaceChange = (space: SpaceType) => {
    setSelectedSpace(space);
    const currentParent = folders.find((f) => f.id === selectedParentId);
    if (!currentParent || currentParent.space !== space) {
      setSelectedParentId(null);
    }
  };

  const isUnchanged =
    selectedSpace === folder.space &&
    selectedParentId === (folder.parentId || null);

  const handleConfirm = () => {
    if (isUnchanged) {
      onToast?.('Thư mục đã ở vị trí này rồi', 'info');
      onClose();
      return;
    }

    try {
      onMove(folder.id, selectedParentId, selectedSpace);
      const targetParent = folders.find((f) => f.id === selectedParentId);
      const spaceLabel = selectedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
      const locText = targetParent
        ? `thư mục "${targetParent.name}" (${spaceLabel})`
        : `thư mục gốc "${spaceLabel}"`;
      onToast?.(`Đã di chuyển thư mục "${folder.name}" vào ${locText}`);
      onClose();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : 'Không thể di chuyển thư mục', 'error');
    }
  };

  const currentSpaceLabel = folder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
  const currentPath = folder.parentId ? getFolderPath(folder.parentId, folders) : null;
  const targetSpaceLabel = selectedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
  const targetParent = folders.find((f) => f.id === selectedParentId);
  const targetPath = targetParent ? getFolderPath(targetParent.id, folders) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-folder-title"
        className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2">
            <span className="text-base">{folder.icon || '📁'}</span>
            <div>
              <h3 id="move-folder-title" className="text-sm font-semibold text-[var(--ui-text)]">
                Di chuyển thư mục
              </h3>
              <p className="text-xs text-[var(--ui-tertiary)] truncate max-w-[260px]">
                {folder.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            className="p-1.5 rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Space selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--ui-text)] block">
              1. Chọn không gian đích
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSpaceChange('personal')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ios-interactive cursor-pointer ${
                  selectedSpace === 'personal'
                    ? 'border-[var(--ui-primary)] theme-primary bg-[var(--ui-primary)] text-white shadow-xs'
                    : 'border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] bg-[var(--ui-subtle)] text-[var(--ui-text)]'
                }`}
              >
                <User className="w-4 h-4 shrink-0 stroke-[1.75]" />
                <div>
                  <div className="text-xs font-bold">Ghi chép của tôi</div>
                  <div
                    className={`text-[10px] ${
                      selectedSpace === 'personal' ? 'text-white/80' : 'text-[var(--ui-tertiary)]'
                    }`}
                  >
                    Cá nhân & riêng tư
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSpaceChange('company')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ios-interactive cursor-pointer ${
                  selectedSpace === 'company'
                    ? 'border-[var(--ui-primary)] theme-primary bg-[var(--ui-primary)] text-white shadow-xs'
                    : 'border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] bg-[var(--ui-subtle)] text-[var(--ui-text)]'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0 stroke-[1.75]" />
                <div>
                  <div className="text-xs font-bold">Tài liệu công ty</div>
                  <div
                    className={`text-[10px] ${
                      selectedSpace === 'company' ? 'text-white/80' : 'text-[var(--ui-tertiary)]'
                    }`}
                  >
                    Chia sẻ nội bộ
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Target parent folder list */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--ui-text)] block">
              2. Chọn vị trí thư mục cha
            </label>
            <div className="border border-[var(--ui-border)] rounded-2xl max-h-52 overflow-y-auto divide-y divide-[var(--ui-border)] bg-[var(--ui-subtle)]">
              {/* Option 1: Root level */}
              <button
                type="button"
                onClick={() => setSelectedParentId(null)}
                className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive cursor-pointer ${
                  selectedParentId === null
                    ? 'bg-[var(--ui-surface)] font-semibold text-[var(--ui-text)] ring-1 ring-[var(--ui-primary)]/40'
                    : 'hover:bg-[var(--ui-surface)] text-[var(--ui-text)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📂</span>
                  <div>
                    <span className="font-semibold block">(Thư mục gốc)</span>
                    <span className="text-[10px] text-[var(--ui-tertiary)] block">
                      Đặt ở cấp ngoài cùng của {targetSpaceLabel}
                    </span>
                  </div>
                </div>
                {selectedParentId === null && (
                  <Check className="w-4 h-4 text-[var(--ui-primary)] stroke-[2.5]" />
                )}
              </button>

              {/* Subfolders list */}
              {allowedFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedParentId(f.id)}
                  className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive cursor-pointer ${
                    selectedParentId === f.id
                      ? 'bg-[var(--ui-surface)] font-semibold text-[var(--ui-text)] ring-1 ring-[var(--ui-primary)]/40'
                      : 'hover:bg-[var(--ui-surface)] text-[var(--ui-text)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-base shrink-0">{f.icon || '📁'}</span>
                    <div className="truncate min-w-0">
                      <span className="truncate block font-medium">{f.name}</span>
                      <span className="text-[10px] text-[var(--ui-tertiary)] truncate block">
                        {getFolderPath(f.id, folders)}
                      </span>
                    </div>
                  </div>
                  {selectedParentId === f.id && (
                    <Check className="w-4 h-4 text-[var(--ui-primary)] stroke-[2.5] shrink-0" />
                  )}
                </button>
              ))}

              {allowedFolders.length === 0 && (
                <div className="p-3 text-center text-xs text-[var(--ui-tertiary)]">
                  Chưa có thư mục nào khác trong không gian này. Thư mục sẽ nằm ở thư mục gốc.
                </div>
              )}
            </div>
          </div>

          {/* Path Transition Preview Card */}
          <div className="p-3.5 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-subtle)] space-y-2">
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--ui-tertiary)] block">
                  Vị trí hiện tại
                </span>
                <span className="font-medium text-[var(--ui-text)] truncate block mt-0.5">
                  {currentSpaceLabel} {currentPath ? ` / ${currentPath}` : ' (Thư mục gốc)'}
                </span>
              </div>

              <div className="px-2 text-[var(--ui-tertiary)] shrink-0">
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </div>

              <div className="flex-1 min-w-0 text-right">
                <span className="text-[10px] uppercase font-bold text-[var(--ui-tertiary)] block">
                  Vị trí mới
                </span>
                <span className="font-bold text-[var(--ui-primary)] truncate block mt-0.5">
                  {targetSpaceLabel} {targetPath ? ` / ${targetPath}` : ' (Thư mục gốc)'}
                </span>
              </div>
            </div>

            {selectedSpace !== folder.space && (
              <div className="pt-2 border-t border-[var(--ui-border)] text-[11px] text-[var(--ui-tertiary)] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 stroke-[1.75] text-amber-500 shrink-0" />
                <span>
                  Các ghi chú và thư mục con bên trong sẽ được tự động chuyển sang không gian{' '}
                  <strong className="text-[var(--ui-text)]">{targetSpaceLabel}</strong>.
                </span>
              </div>
            )}
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
            onClick={handleConfirm}
            disabled={isUnchanged}
            className="px-4 py-2 text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-xl shadow-xs transition-colors ios-interactive cursor-pointer disabled:opacity-40"
          >
            Xác nhận di chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
