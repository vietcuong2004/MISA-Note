import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Folder as FolderIcon, Plus, Trash2 } from 'lucide-react';
import { Document, Folder, SpaceType, ViewState } from '../../types';

interface Props {
  folders: Folder[];
  documents: Document[];
  space: SpaceType;
  view: ViewState;
  expanded: Record<string, boolean>;
  dragOverFolderId: string | null;
  onToggle: (id: string) => void;
  onNavigate: (view: ViewState) => void;
  onCreateFolder: (space: SpaceType, parentId?: string | null) => void;
  newFolderId: string | null;
  onFinishNewFolder: () => void;
  onRenameNewFolder: (folder: Folder, name: string) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (id: string) => void;
  onDragOverFolder: (id: string | null) => void;
  onDropDocument: (folder: Folder, documentId: string) => void;
  draggingDocumentId: string | null;
  renderDocument: (document: Document, folderId: string) => React.ReactNode;
}

function NewFolderName({ folder, onSave, onFinish }: { folder: Folder; onSave: (folder: Folder, name: string) => void; onFinish: () => void }) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); inputRef.current?.scrollIntoView({ block: 'nearest' }); }, []);
  const save = () => {
    if (finished.current) return;
    try { onSave(folder, name.trim() || folder.name); finished.current = true; }
    catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được tên thư mục.'); }
  };
  return <span className="min-w-0 flex-1">
    <input ref={inputRef} aria-label="Tên thư mục mới" value={name} onChange={event => setName(event.target.value)}
      onClick={event => event.stopPropagation()} onBlur={save}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Enter') { event.preventDefault(); save(); }
        if (event.key === 'Escape') { event.preventDefault(); finished.current = true; onFinish(); }
      }} className="w-full min-w-0 px-1 py-0.5 rounded border border-[var(--ui-accent)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] outline-none" />
    {error && <span role="alert" className="block text-[10px] text-red-600">{error}</span>}
  </span>;
}

export function FolderTree(props: Props) {
  const folders = props.folders.filter(folder => folder.space === props.space);
  const parentId = (folder: Folder) => folders.some(parent => parent.id === folder.parentId) ? folder.parentId : null;
  const renderBranch = (parent: string | null, ancestors: Set<string>): React.ReactNode =>
    folders.filter(folder => (parentId(folder) || null) === parent && !ancestors.has(folder.id)).map(folder => {
      const open = !!props.expanded[folder.id];
      const notes = props.documents.filter(document => document.folderId === folder.id && !document.isTrash);
      const hasChildren = folders.some(child => child.parentId === folder.id);
      const draggingOver = props.dragOverFolderId === folder.id;
      return <div key={folder.id} data-folder-id={folder.id} className="space-y-0.5">
        <div onClick={() => props.onToggle(folder.id)}
          className={`group flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl cursor-pointer text-[var(--ui-text)] transition-colors ${draggingOver ? 'bg-[var(--ui-selected)] ring-1 ring-[var(--ui-primary)]' : 'hover:bg-[var(--ui-selected)]'}`}
          onDragOver={event => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; props.onDragOverFolder(folder.id); }}
          onDragLeave={event => { event.stopPropagation(); if (!event.currentTarget.contains(event.relatedTarget as Node)) props.onDragOverFolder(null); }}
          onDrop={event => {
            event.preventDefault(); event.stopPropagation();
            const id = event.dataTransfer.getData('text/plain') || props.draggingDocumentId;
            props.onDragOverFolder(null);
            if (id) props.onDropDocument(folder, id);
          }}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button type="button" aria-label={`${open ? 'Thu gọn' : 'Mở'} thư mục ${folder.name}`} aria-expanded={open}
              onClick={event => { event.stopPropagation(); props.onToggle(folder.id); }} className="text-[var(--ui-tertiary)] shrink-0">
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <FolderIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            {props.newFolderId === folder.id ? <NewFolderName folder={folder} onSave={props.onRenameNewFolder} onFinish={props.onFinishNewFolder} /> : <button type="button" className="truncate font-medium text-xs text-left"
              aria-current={props.view.type === 'folder' && props.view.folderId === folder.id ? 'page' : undefined}
              onClick={event => { event.stopPropagation(); props.onNavigate({ type: 'folder', folderId: folder.id }); }}>{folder.name}</button>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
            <button type="button" title="Tạo thư mục con" aria-label={`Tạo thư mục con trong ${folder.name}`}
              onClick={event => { event.stopPropagation(); props.onCreateFolder(folder.space, folder.id); }} className="p-1 rounded hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)]"><Plus className="w-3 h-3" /></button>
            <button type="button" title="Đổi tên thư mục" aria-label={`Đổi tên thư mục ${folder.name}`}
              onClick={event => { event.stopPropagation(); props.onEditFolder(folder); }} className="p-1 rounded hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)]"><Edit2 className="w-3 h-3" /></button>
            <button type="button" title="Xóa thư mục" aria-label={`Xóa thư mục ${folder.name}`}
              onClick={event => { event.stopPropagation(); props.onDeleteFolder(folder.id); }} className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-[var(--ui-muted)]"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        {open && <div className="pl-3 space-y-0.5 border-l border-[var(--ui-border)] ml-3.5 my-0.5">
          {renderBranch(folder.id, new Set([...ancestors, folder.id]))}
          {notes.map(document => props.renderDocument(document, folder.id))}
          {!hasChildren && !notes.length && <p className="text-[10px] text-[var(--ui-tertiary)] italic px-2 py-1">Thư mục trống</p>}
        </div>}
      </div>;
    });
  return <>{renderBranch(null, new Set())}</>;
}
