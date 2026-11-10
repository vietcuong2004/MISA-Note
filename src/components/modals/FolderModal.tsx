import { RenameDialog } from './RenameDialog';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

  if (folderToEdit) return <RenameDialog key={folderToEdit.id} kind="folder" initialName={folderToEdit.name}
    onClose={onClose} onSave={name => {
      onSaveFolder({ ...folderToEdit, name, updatedAt: new Date().toISOString() });
      onToast('Đã đổi tên thư mục');
    }} />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const folder: Folder = {
      id: `fld_${crypto.randomUUID()}`,
      parentId: parentFolder?.id || null,
      name: name.trim(),
      space,
      icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try { onSaveFolder(folder); }
    catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được thư mục.'); return; }
    onToast(folderToEdit ? `Đã đổi tên thư mục thành "${name.trim()}"` : 'Đã tạo thư mục mới');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-dialog-title"
        className="bg-white dark:bg-[#1E1E20] rounded-[24px] shadow-2xl border border-neutral-100 dark:border-neutral-800 w-full max-w-[400px] p-6 animate-in zoom-in-95 duration-150"
      >
        {/* Header matching image: Title + Subtitle on left, small subtle X on right */}
        <div className="flex items-start justify-between">
          <div>
            <h3 id="folder-dialog-title" className="text-[17px] font-bold text-neutral-900 dark:text-neutral-100">
              {folderToEdit ? 'Đặt lại tên thư mục' : parentFolder ? 'Tạo thư mục con' : 'Tạo thư mục mới'}
            </h3>
            <p className="text-sm text-neutral-400 dark:text-neutral-400 mt-0.5">
              Ngắn gọn và dễ nhận ra
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng thư mục"
            title="Đóng"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer -mr-1 -mt-0.5"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          {parentFolder && !folderToEdit && (
            <p className="text-xs text-[var(--ui-muted)]">
              Thư mục cha: <strong className="text-[var(--ui-text)]">{parentFolder.name}</strong>
            </p>
          )}

          {/* Folder name input with active blue ring matching screenshot */}
          <div>
            <input
              id="folder-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder={folderToEdit ? 'Nhập tên thư mục...' : 'VD: Dự án Sprint 14...'}
              className="w-full px-3.5 py-2.5 text-[14px] bg-white dark:bg-[#151516] border border-[#007AFF] ring-1 ring-[#007AFF] rounded-xl outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 transition-all"
            />
          </div>

          {/* Buttons: Pill shape Huỷ and Lưu matching screenshot */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 text-sm font-medium rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#252528] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#2e2e32] transition-colors cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-1.5 text-sm font-semibold rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {folderToEdit ? 'Lưu' : 'Tạo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
