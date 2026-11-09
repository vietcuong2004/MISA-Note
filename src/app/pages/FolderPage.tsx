import React, { useState } from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';
import { NotFoundPage } from './NotFoundPage';
import { Folder as FolderIcon, Plus, Edit2, FolderInput, Trash2, ArrowLeft } from 'lucide-react';
import { ViewState } from '../../types';
import { getFolderPath } from '../../utils/folders';
import {
  canDropFolderInto,
  clearActiveDrag,
  getDragPayload,
  setDragFolder,
} from '../../utils/dnd';

export function FolderPage({
  folderId,
  documents,
  folders,
  actions,
  onNavigate,
}: DocumentPageProps & { folderId: string; onNavigate: (view: ViewState) => void }) {
  const folder = folders.find((f) => f.id === folderId);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  if (!folder) return <NotFoundPage title="Không tìm thấy thư mục" />;
  const children = folders.filter((child) => child.parentId === folderId && child.space === folder.space);

  const handleDropOnTarget = (
    e: React.DragEvent,
    targetParentId: string | null,
    targetSpace = folder.space,
    locationLabel = 'vị trí mới'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    const payload = getDragPayload(e, folders, documents);
    clearActiveDrag();
    if (!payload) return;

    if (payload.type === 'folder') {
      if (!canDropFolderInto(payload.id, targetParentId, folders)) {
        actions.onToast?.('Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó', 'error');
        return;
      }
      actions.onMoveFolder?.(payload.id, targetParentId, targetSpace);
      actions.onToast?.(`Đã di chuyển thư mục vào ${locationLabel}`);
    } else if (payload.type === 'document') {
      actions.onMoveDocument?.(payload.id, targetParentId, targetSpace);
      actions.onToast?.(`Đã di chuyển tài liệu vào ${locationLabel}`);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <section
        aria-label="Thao tác thư mục và thư mục con"
        className="px-6 md:px-10 pt-5 flex flex-wrap items-center justify-between gap-2 max-w-6xl w-full mx-auto"
      >
        <div className="flex flex-wrap items-center gap-2">
          {folder.parentId ? (
            <button
              type="button"
              onClick={() => onNavigate({ type: 'folder', folderId: folder.parentId! })}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverTarget !== 'parent') setDragOverTarget('parent');
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverTarget === 'parent') setDragOverTarget(null);
                }
              }}
              onDrop={(e) =>
                handleDropOnTarget(
                  e,
                  folder.parentId || null,
                  folder.space,
                  `thư mục cha "${getFolderPath(folder.parentId, folders)}"`
                )
              }
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                dragOverTarget === 'parent'
                  ? 'border-[var(--ui-primary)] bg-[var(--ui-selected)] text-[var(--ui-primary)] font-bold scale-105 shadow-xs'
                  : 'text-[var(--ui-muted)] border-transparent hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{getFolderPath(folder.parentId, folders)}</span>
              {dragOverTarget === 'parent' && (
                <span className="text-[10px] bg-[var(--ui-primary)] text-white px-1.5 py-0.2 rounded font-medium ml-1">
                  Thả ra cấp cha
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate({ type: folder.space === 'personal' ? 'private' : 'company' })}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverTarget !== 'root') setDragOverTarget('root');
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverTarget === 'root') setDragOverTarget(null);
                }
              }}
              onDrop={(e) =>
                handleDropOnTarget(
                  e,
                  null,
                  folder.space,
                  `thư mục gốc (${folder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'})`
                )
              }
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                dragOverTarget === 'root'
                  ? 'border-[var(--ui-primary)] bg-[var(--ui-selected)] text-[var(--ui-primary)] font-bold scale-105 shadow-xs'
                  : 'text-[var(--ui-muted)] border-transparent hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{folder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}</span>
              {dragOverTarget === 'root' && (
                <span className="text-[10px] bg-[var(--ui-primary)] text-white px-1.5 py-0.2 rounded font-medium ml-1">
                  Thả ra thư mục gốc
                </span>
              )}
            </button>
          )}

          {children.map((child) => {
            const isChildOver = dragOverTarget === child.id;

            return (
              <button
                key={child.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragFolder(e, child.id);
                }}
                onDragEnd={() => {
                  clearActiveDrag();
                }}
                onClick={() => onNavigate({ type: 'folder', folderId: child.id })}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverTarget !== child.id) setDragOverTarget(child.id);
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverTarget === child.id) setDragOverTarget(null);
                  }
                }}
                onDrop={(e) => handleDropOnTarget(e, child.id, child.space, `thư mục "${child.name}"`)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                  isChildOver
                    ? 'border-[var(--ui-primary)] bg-[var(--ui-selected)] text-[var(--ui-primary)] font-bold scale-105 shadow-xs ring-2 ring-[var(--ui-primary)]'
                    : 'border-[var(--ui-border)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                <FolderIcon className={`w-3.5 h-3.5 ${isChildOver ? 'text-[var(--ui-primary)]' : ''}`} />
                <span>{child.name}</span>
                {isChildOver && (
                  <span className="text-[10px] bg-[var(--ui-primary)] text-white px-1.5 py-0.2 rounded font-medium">
                    Thả vào đây
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => actions.onCreateFolder?.(folder.space, folder.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--ui-hover)] border border-dashed border-[var(--ui-border)] transition-colors cursor-pointer text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thư mục con</span>
          </button>
        </div>

        {/* Folder management action buttons */}
        <div className="flex items-center gap-1.5">
          {actions.onEditFolder && (
            <button
              type="button"
              onClick={() => actions.onEditFolder?.(folder)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] border border-[var(--ui-border)] transition-colors cursor-pointer"
              title="Đổi tên thư mục"
            >
              <Edit2 className="w-3 h-3 stroke-[1.75]" />
              <span>Đổi tên</span>
            </button>
          )}
          {actions.onMoveFolderRequest && (
            <button
              type="button"
              onClick={() => actions.onMoveFolderRequest?.(folder)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] border border-[var(--ui-border)] transition-colors cursor-pointer"
              title="Di chuyển thư mục"
            >
              <FolderInput className="w-3 h-3 stroke-[1.75]" />
              <span>Di chuyển</span>
            </button>
          )}
          {actions.onDeleteFolder && (
            <button
              type="button"
              onClick={() => actions.onDeleteFolder?.(folder.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
              title="Xóa thư mục"
            >
              <Trash2 className="w-3 h-3 stroke-[1.75]" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </section>

      <LibraryView
        {...actions}
        title={folder.name}
        description={`${folder.space === 'personal' ? 'Ghi chú của tôi' : 'Tài liệu công ty'} / ${getFolderPath(folder.id, folders)}`}
        documents={documents.filter((doc) => doc.folderId === folderId)}
        folders={folders.filter((candidate) => candidate.space === folder.space)}
        showTabs={false}
        defaultSpace={folder.space}
        defaultFolderId={folderId}
      />
    </div>
  );
}
