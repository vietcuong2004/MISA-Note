import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';
import { NotFoundPage } from './NotFoundPage';
import { Folder as FolderIcon, Plus, Edit2, FolderInput, Trash2 } from 'lucide-react';
import { ViewState } from '../../types';
import { getFolderPath } from '../../utils/folders';

export function FolderPage({
  folderId,
  documents,
  folders,
  actions,
  onNavigate,
}: DocumentPageProps & { folderId: string; onNavigate: (view: ViewState) => void }) {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return <NotFoundPage title="Không tìm thấy thư mục" />;
  const children = folders.filter((child) => child.parentId === folderId && child.space === folder.space);

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
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rawFolder = e.dataTransfer.getData('text/folder-id') || e.dataTransfer.getData('application/x-folder-id');
                const rawPlain = e.dataTransfer.getData('text/plain') || '';
                const rawDoc = e.dataTransfer.getData('application/x-doc-id') || '';
                let fldId = rawFolder || (rawPlain.startsWith('folder:') ? rawPlain.replace('folder:', '') : null);
                let docId = rawDoc || (rawPlain.startsWith('doc:') ? rawPlain.replace('doc:', '') : null);
                if (!fldId && !docId && rawPlain) {
                  if (folders.some(f => f.id === rawPlain)) fldId = rawPlain; else docId = rawPlain;
                }
                if (fldId && fldId !== folder.parentId) {
                  actions.onMoveFolder?.(fldId, folder.parentId || null, folder.space);
                  actions.onToast?.('Đã di chuyển thư mục ra cấp cha');
                } else if (docId) {
                  actions.onMoveDocument?.(docId, folder.parentId || null, folder.space);
                  actions.onToast?.('Đã di chuyển tài liệu ra cấp cha');
                }
              }}
              className="text-xs text-[var(--ui-muted)] px-2 py-1.5 hover:underline cursor-pointer"
            >
              ← {getFolderPath(folder.parentId, folders)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate({ type: folder.space === 'personal' ? 'private' : 'company' })}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rawFolder = e.dataTransfer.getData('text/folder-id') || e.dataTransfer.getData('application/x-folder-id');
                const rawPlain = e.dataTransfer.getData('text/plain') || '';
                const rawDoc = e.dataTransfer.getData('application/x-doc-id') || '';
                let fldId = rawFolder || (rawPlain.startsWith('folder:') ? rawPlain.replace('folder:', '') : null);
                let docId = rawDoc || (rawPlain.startsWith('doc:') ? rawPlain.replace('doc:', '') : null);
                if (!fldId && !docId && rawPlain) {
                  if (folders.some(f => f.id === rawPlain)) fldId = rawPlain; else docId = rawPlain;
                }
                const spaceTitle = folder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
                if (fldId) {
                  actions.onMoveFolder?.(fldId, null, folder.space);
                  actions.onToast?.(`Đã di chuyển thư mục ra thư mục gốc (${spaceTitle})`);
                } else if (docId) {
                  actions.onMoveDocument?.(docId, null, folder.space);
                  actions.onToast?.(`Đã di chuyển tài liệu ra thư mục gốc (${spaceTitle})`);
                }
              }}
              className="text-xs text-[var(--ui-muted)] px-2 py-1.5 hover:underline cursor-pointer"
            >
              ← {folder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}
            </button>
          )}
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => onNavigate({ type: 'folder', folderId: child.id })}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rawFolder = e.dataTransfer.getData('text/folder-id') || e.dataTransfer.getData('application/x-folder-id');
                const rawPlain = e.dataTransfer.getData('text/plain') || '';
                const rawDoc = e.dataTransfer.getData('application/x-doc-id') || '';
                let fldId = rawFolder || (rawPlain.startsWith('folder:') ? rawPlain.replace('folder:', '') : null);
                let docId = rawDoc || (rawPlain.startsWith('doc:') ? rawPlain.replace('doc:', '') : null);
                if (!fldId && !docId && rawPlain) {
                  if (folders.some(f => f.id === rawPlain)) fldId = rawPlain; else docId = rawPlain;
                }
                if (fldId && fldId !== child.id) {
                  actions.onMoveFolder?.(fldId, child.id, child.space);
                  actions.onToast?.(`Đã di chuyển thư mục vào thư mục "${child.name}"`);
                } else if (docId) {
                  actions.onMoveDocument?.(docId, child.id, child.space);
                  actions.onToast?.(`Đã di chuyển tài liệu vào thư mục "${child.name}"`);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <FolderIcon className="w-3.5 h-3.5" />
              <span>{child.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => actions.onCreateFolder?.(folder.space, folder.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--ui-hover)] border border-dashed border-[var(--ui-border)] transition-colors cursor-pointer"
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
