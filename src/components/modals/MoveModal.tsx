import React, { useState, useEffect } from 'react';
import { X, User, Building2, Check, ArrowRight } from 'lucide-react';
import { Document, Folder as FolderType, SpaceType } from '../../types';
import { getFolderPath } from '../../utils/folders';

interface MoveModalProps {
  document: Document;
  folders: FolderType[];
  isOpen: boolean;
  onClose: () => void;
  onMove: (docId: string, targetFolderId: string | null, targetSpace: SpaceType) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  document,
  folders,
  isOpen,
  onClose,
  onMove,
  onToast,
}) => {
  const [selectedSpace, setSelectedSpace] = useState<SpaceType>(document.space);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(document.folderId);

  useEffect(() => {
    if (isOpen) {
      setSelectedSpace(document.space);
      setSelectedFolderId(document.folderId ?? null);
    }
  }, [isOpen, document.id, document.space, document.folderId]);

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

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) => f.space === selectedSpace);

  const handleSpaceChange = (space: SpaceType) => {
    setSelectedSpace(space);
    const currentFolder = folders.find((f) => f.id === selectedFolderId);
    if (!currentFolder || currentFolder.space !== space) {
      setSelectedFolderId(null);
    }
  };

  const isUnchanged =
    selectedSpace === document.space &&
    selectedFolderId === (document.folderId ?? null);

  const handleConfirm = () => {
    if (isUnchanged) {
      onToast('Tài liệu đã ở vị trí này rồi', 'info');
      onClose();
      return;
    }

    onMove(document.id, selectedFolderId, selectedSpace);
    const targetFolder = folders.find((f) => f.id === selectedFolderId);
    const spaceLabel = selectedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
    const locationName = targetFolder
      ? `thư mục "${targetFolder.name}"`
      : `thư mục gốc ("${spaceLabel}")`;

    onToast(`Đã di chuyển tài liệu vào ${locationName}`);
    onClose();
  };

  const currentSpaceLabel = document.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
  const currentFolder = folders.find((f) => f.id === document.folderId);
  const currentPath = currentFolder ? getFolderPath(currentFolder.id, folders) : null;

  const targetSpaceLabel = selectedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
  const targetFolder = folders.find((f) => f.id === selectedFolderId);
  const targetPath = targetFolder ? getFolderPath(targetFolder.id, folders) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-modal-title"
        className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2">
            <span className="text-base">{document.icon || '📄'}</span>
            <div>
              <h3 id="move-modal-title" className="text-sm font-semibold text-[var(--ui-text)]">
                Di chuyển tài liệu
              </h3>
              {document.title && (
                <p className="text-xs text-[var(--ui-tertiary)] truncate max-w-[280px]">
                  {document.title}
                </p>
              )}
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

          {/* Folder selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--ui-text)] block">
              2. Chọn thư mục đích
            </label>
            <div className="border border-[var(--ui-border)] rounded-2xl max-h-56 overflow-y-auto divide-y divide-[var(--ui-border)] bg-[var(--ui-subtle)]">
              {/* Option: Root level */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive cursor-pointer ${
                  selectedFolderId === null
                    ? 'bg-[var(--ui-surface)] font-semibold text-[var(--ui-text)] ring-1 ring-[var(--ui-primary)]/40'
                    : 'hover:bg-[var(--ui-surface)] text-[var(--ui-text)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📂</span>
                  <div>
                    <span className="font-semibold block">(Thư mục gốc)</span>
                    <span className="text-[10px] text-[var(--ui-tertiary)] block">
                      Đưa ra cấp ngoài cùng của {targetSpaceLabel} (không nằm trong thư mục)
                    </span>
                  </div>
                </div>
                {selectedFolderId === null && (
                  <Check className="w-4 h-4 text-[var(--ui-primary)] stroke-[2.5]" />
                )}
              </button>

              {filteredFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive cursor-pointer ${
                    selectedFolderId === folder.id
                      ? 'bg-[var(--ui-surface)] font-semibold text-[var(--ui-text)] ring-1 ring-[var(--ui-primary)]/40'
                      : 'hover:bg-[var(--ui-surface)] text-[var(--ui-text)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-base shrink-0">{folder.icon || '📁'}</span>
                    <div className="truncate min-w-0">
                      <span className="truncate block font-medium">{folder.name}</span>
                      <span className="text-[10px] text-[var(--ui-tertiary)] truncate block">
                        {getFolderPath(folder.id, folders)}
                      </span>
                    </div>
                  </div>
                  {selectedFolderId === folder.id && (
                    <Check className="w-4 h-4 text-[var(--ui-primary)] stroke-[2.5] shrink-0" />
                  )}
                </button>
              ))}

              {filteredFolders.length === 0 && (
                <div className="p-3 text-center text-xs text-[var(--ui-tertiary)]">
                  Chưa có thư mục nào trong không gian này. Tài liệu sẽ nằm ở thư mục gốc.
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[var(--ui-subtle)] border-t border-[var(--ui-border)]">
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
