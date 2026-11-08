import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FolderEdit } from 'lucide-react';
import { Folder, SpaceType } from '../../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: Folder | null;
  parentFolder?: Folder | null;
  defaultSpace?: SpaceType;
  onSaveFolder: (folder: Folder) => void;
  onToast: (msg: string) => void;
}

const EMOJI_OPTIONS = ['📁', '🚀', '📋', '📚', '💡', '📝', '🎯', '📊', '💼', '⚙️', '🔒', '👥'];

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folderToEdit,
  parentFolder,
  defaultSpace = 'personal',
  onSaveFolder,
  onToast,
}) => {
  const [name, setName] = useState('');
  const [space, setSpace] = useState<SpaceType>(defaultSpace);
  const [icon, setIcon] = useState('📁');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    setError('');
    if (folderToEdit) {
      setName(folderToEdit.name);
      setSpace(folderToEdit.space);
      setIcon(folderToEdit.icon || '📁');
    } else {
      setName('');
      setSpace(parentFolder?.space || defaultSpace);
      setIcon('📁');
    }
  }, [folderToEdit, parentFolder, defaultSpace, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const folder: Folder = {
      ...folderToEdit,
      id: folderToEdit?.id || `fld_${crypto.randomUUID()}`,
      parentId: folderToEdit?.parentId || parentFolder?.id || null,
      name: name.trim(),
      space,
      icon,
      createdAt: folderToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try { onSaveFolder(folder); }
    catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được thư mục.'); return; }
    onToast(folderToEdit ? 'Đã đổi tên thư mục' : 'Đã tạo thư mục mới');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center">
              {folderToEdit ? <FolderEdit className="w-4 h-4 stroke-[1.75]" /> : <FolderPlus className="w-4 h-4 stroke-[1.75]" />}
            </div>
            <h3 id="folder-dialog-title" className="text-sm font-bold text-[var(--ui-text)]">
              {folderToEdit ? 'Đổi tên thư mục' : parentFolder ? 'Tạo thư mục con' : 'Tạo thư mục mới'}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Đóng thư mục"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          {parentFolder && <p className="text-xs text-[var(--ui-muted)]">Thư mục cha: <strong className="text-[var(--ui-text)]">{parentFolder.name}</strong></p>}
          {!folderToEdit && !parentFolder && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ui-text)] block">Khu vực</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSpace('personal')}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all ios-interactive ${
                    space === 'personal'
                      ? 'border-[var(--ui-primary)] theme-primary bg-[var(--ui-primary)] text-white shadow-xs'
                      : 'border-[var(--ui-border)] bg-[var(--ui-subtle)] text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]'
                  }`}
                >
                  Ghi chép của tôi
                </button>
                <button
                  type="button"
                  onClick={() => setSpace('company')}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all ios-interactive ${
                    space === 'company'
                      ? 'border-[var(--ui-primary)] theme-primary bg-[var(--ui-primary)] text-white shadow-xs'
                      : 'border-[var(--ui-border)] bg-[var(--ui-subtle)] text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]'
                  }`}
                >
                  Tài liệu công ty
                </button>
              </div>
            </div>
          )}

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--ui-text)] block">Biểu tượng thư mục</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all ios-interactive ${
                    icon === emoji
                      ? 'theme-primary bg-[var(--ui-primary)] text-white shadow-xs scale-105'
                      : 'bg-[var(--ui-hover)] hover:bg-[var(--ui-border)] text-[var(--ui-text)]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Folder name input */}
          <div className="space-y-1.5">
            <label htmlFor="folder-name" className="text-xs font-bold text-[var(--ui-text)] block">Tên thư mục</label>
            <input
              id="folder-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Dự án Sprint 14..."
              className="w-full px-3.5 py-2.5 text-xs bg-[var(--ui-subtle)] border border-[var(--ui-border)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] text-[var(--ui-text)]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[var(--ui-muted)] hover:text-[var(--ui-text)] rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-xl shadow-xs disabled:opacity-40 transition-colors ios-interactive"
            >
              {folderToEdit ? 'Cập nhật' : 'Tạo thư mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
