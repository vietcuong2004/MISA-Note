import React, { useState } from 'react';
import { X, Folder, ArrowRight, User, Building2, Check } from 'lucide-react';
import { Document, Folder as FolderType, SpaceType } from '../../types';

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
      ? `thư mục "${targetFolder.name}"`
      : selectedSpace === 'personal'
      ? 'không gian "Ghi chép của tôi"'
      : 'không gian "Tài liệu công ty"';
    onToast(`Đã di chuyển tài liệu vào ${locationName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Di chuyển tài liệu</h3>
              <p className="text-xs text-[#86868B] truncate max-w-[260px]">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Space selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1D1D1F] block">Chọn không gian</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSpaceChange('personal')}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all ios-interactive ${
                  selectedSpace === 'personal'
                    ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-xs'
                    : 'border-[#E5E5EA] hover:border-[#D1D1D6] bg-[#F8F8FA] text-[#1D1D1F]'
                }`}
              >
                <User className="w-4 h-4 shrink-0 stroke-[1.75]" />
                <div>
                  <div className="text-xs font-bold">Ghi chép của tôi</div>
                  <div
                    className={`text-[10px] ${
                      selectedSpace === 'personal' ? 'text-white/80' : 'text-[#86868B]'
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
                    ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-xs'
                    : 'border-[#E5E5EA] hover:border-[#D1D1D6] bg-[#F8F8FA] text-[#1D1D1F]'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0 stroke-[1.75]" />
                <div>
                  <div className="text-xs font-bold">Tài liệu công ty</div>
                  <div
                    className={`text-[10px] ${
                      selectedSpace === 'company' ? 'text-white/80' : 'text-[#86868B]'
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
            <label className="text-xs font-bold text-[#1D1D1F] block">Chọn thư mục đích</label>
            <div className="border border-[#E5E5EA] rounded-2xl max-h-56 overflow-y-auto divide-y divide-[#E5E5EA] bg-[#F8F8FA]">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive ${
                  selectedFolderId === null
                    ? 'bg-white font-semibold text-[#1D1D1F]'
                    : 'hover:bg-white text-[#1D1D1F]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📂</span>
                  <span>(Thư mục gốc)</span>
                </div>
                {selectedFolderId === null && <Check className="w-4 h-4 text-[#1D1D1F] stroke-[2]" />}
              </button>

              {filteredFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center justify-between p-3 text-xs text-left transition-colors ios-interactive ${
                    selectedFolderId === folder.id
                      ? 'bg-white font-semibold text-[#1D1D1F]'
                      : 'hover:bg-white text-[#1D1D1F]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{folder.icon || '📁'}</span>
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {selectedFolderId === folder.id && <Check className="w-4 h-4 text-[#1D1D1F] stroke-[2]" />}
                </button>
              ))}

              {filteredFolders.length === 0 && (
                <div className="p-4 text-center text-xs text-[#86868B]">
                  Chưa có thư mục nào trong không gian này.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#F8F8FA] border-t border-[#E5E5EA]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1F] hover:bg-black rounded-xl shadow-xs transition-colors ios-interactive"
          >
            Xác nhận di chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
