import React, { useState } from 'react';
import { X, Folder, ArrowRight, User, Building2, Check } from 'lucide-react';
import { Document, Folder as FolderType, SpaceType } from '../../types';
import { getFolderPath } from '../../utils/folders';

interface MoveModalProps {
  document: Document;
  folders: FolderType[];
  isOpen: boolean;
  onClose: () => void;
  onMove: (docId: string, targetFolderId: string | null, targetSpace: SpaceType) => void;
  onToast: (msg: string) => void;
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

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) => f.space === selectedSpace);

  const handleSpaceChange = (space: SpaceType) => {
    setSelectedSpace(space);
    const currentFolder = folders.find((f) => f.id === selectedFolderId);
    if (!currentFolder || currentFolder.space !== space) {
      setSelectedFolderId(null);
    }
  };

  const handleConfirm = () => {
    onMove(document.id, selectedFolderId, selectedSpace);
    const targetFolder = folders.find((f) => f.id === selectedFolderId);
    const locationName = targetFolder
      ? `thư mục "${getFolderPath(targetFolder.id, folders)}"`
      : selectedSpace === 'personal'
      ? 'không gian "Ghi chép của tôi"'
      : 'không gian "Tài liệu công ty"';
    onToast(`Đã di chuyển tài liệu vào ${locationName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ui-text)]">Di chuyển tài liệu</h3>
              <p className="text-xs text-[var(--ui-tertiary)] truncate max-w-[260px]">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Space selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--ui-text)] block">Chọn không gian</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSpaceChange('personal')}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all ios-interactive ${
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
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all ios-interactive ${
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
            <label className="text-xs font-bold text-[var(--ui-text)] block">Chọn thư mục đích</label>
            <div className="border border-[var(--ui-border)] rounded-2xl max-h-56 overflow-y-auto divide-y divide-[var(--ui-border)] bg-[var(--ui-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive ${
                  selectedFolderId === null
                    ? 'bg-[var(--ui-surface)] font-semibold text-[var(--ui-text)]'
                    : 'hover:bg-[var(--ui-surface)] text-[var(--ui-text)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📂</span>
                  <span>(Thư mục gốc)</span>
                </div>
                {selectedFolderId === null && <Check className="w-4 h-4 text-[var(--ui-text)] stroke-[2]" />}
              </button>

              {filteredFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive ${
                    selectedFolderId === folder.id
                      ? 'bg-[var(--ui-surface)] font-semibold text-[var(--ui-text)]'
                      : 'hover:bg-[var(--ui-surface)] text-[var(--ui-text)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{folder.icon || '📁'}</span>
                    <span className="truncate">{getFolderPath(folder.id, folders)}</span>
                  </div>
                  {selectedFolderId === folder.id && <Check className="w-4 h-4 text-[var(--ui-text)] stroke-[2]" />}
                </button>
              ))}

              {filteredFolders.length === 0 && (
                <div className="p-4 text-center text-xs text-[var(--ui-tertiary)]">
                  Chưa có thư mục nào trong không gian này.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[var(--ui-subtle)] border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--ui-muted)] hover:text-[var(--ui-text)] rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-xl shadow-xs transition-colors ios-interactive"
          >
            Xác nhận di chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
