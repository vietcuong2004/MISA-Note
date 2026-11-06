import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FolderEdit } from 'lucide-react';
import { Folder, SpaceType } from '../../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: Folder | null;
  defaultSpace?: SpaceType;
  onSaveFolder: (folder: Folder) => void;
  onToast: (msg: string) => void;
}

const EMOJI_OPTIONS = ['📁', '🚀', '📋', '📚', '💡', '📝', '🎯', '📊', '💼', '⚙️', '🔒', '👥'];

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folderToEdit,
  defaultSpace = 'personal',
  onSaveFolder,
  onToast,
}) => {
  const [name, setName] = useState('');
  const [space, setSpace] = useState<SpaceType>(defaultSpace);
  const [icon, setIcon] = useState('📁');

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setSpace(folderToEdit.space);
      setIcon(folderToEdit.icon || '📁');
    } else {
      setName('');
      setSpace(defaultSpace);
      setIcon('📁');
    }
  }, [folderToEdit, defaultSpace, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const folder: Folder = {
      id: folderToEdit?.id || `fld_${Date.now()}`,
      name: name.trim(),
      space,
      icon,
      createdAt: folderToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveFolder(folder);
    onToast(folderToEdit ? 'Đã đổi tên thư mục' : 'Đã tạo thư mục mới');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center">
              {folderToEdit ? <FolderEdit className="w-4 h-4 stroke-[1.75]" /> : <FolderPlus className="w-4 h-4 stroke-[1.75]" />}
            </div>
            <h3 className="text-sm font-bold text-[#1D1D1F]">
              {folderToEdit ? 'Đổi tên thư mục' : 'Tạo thư mục mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!folderToEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1D1D1F] block">Khu vực</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSpace('personal')}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all ios-interactive ${
                    space === 'personal'
                      ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-xs'
                      : 'border-[#E5E5EA] bg-[#F8F8FA] text-[#1D1D1F] hover:border-[#D1D1D6]'
                  }`}
                >
                  Ghi chép của tôi
                </button>
                <button
                  type="button"
                  onClick={() => setSpace('company')}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all ios-interactive ${
                    space === 'company'
                      ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-xs'
                      : 'border-[#E5E5EA] bg-[#F8F8FA] text-[#1D1D1F] hover:border-[#D1D1D6]'
                  }`}
                >
                  Tài liệu công ty
                </button>
              </div>
            </div>
          )}

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1D1D1F] block">Biểu tượng thư mục</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all ios-interactive ${
                    icon === emoji
                      ? 'bg-[#1D1D1F] text-white shadow-xs scale-105'
                      : 'bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Folder name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1D1D1F] block">Tên thư mục</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Dự án Sprint 14..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D1D1F] focus:border-[#1D1D1F] text-[#1D1D1F]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1F] hover:bg-black rounded-xl shadow-xs disabled:opacity-40 transition-colors ios-interactive"
            >
              {folderToEdit ? 'Cập nhật' : 'Tạo thư mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
