import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Folder as FolderIcon, FolderInput, GripVertical, Plus, Trash2 } from 'lucide-react';
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
  onMoveFolder?: (folder: Folder) => void;
  onDeleteFolder: (id: string) => void;
  onDragOverFolder: (id: string | null) => void;
  onDropDocument: (folder: Folder, documentId: string) => void;
  onDropFolder?: (targetFolder: Folder, draggedFolderId: string) => void;
  draggingDocumentId: string | null;
  draggingFolderId?: string | null;
  onDragStartFolder?: (folderId: string) => void;
  onDragEndFolder?: () => void;
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
  const folders = props.folders.filter((folder) => folder.space === props.space);
  const parentId = (folder: Folder) =>
    folders.some((parent) => parent.id === folder.parentId) ? folder.parentId : null;

  const autoExpandTimerRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const isDraggingAny = !!(props.draggingDocumentId || props.draggingFolderId);

  const handleFolderHover = (folderId: string, isOpen: boolean) => {
    if (props.dragOverFolderId !== folderId) {
      props.onDragOverFolder(folderId);
    }
    if (!isOpen) {
      if (autoExpandTimerRef.current?.id !== folderId) {
        if (autoExpandTimerRef.current?.timer) clearTimeout(autoExpandTimerRef.current.timer);
        autoExpandTimerRef.current = {
          id: folderId,
          timer: setTimeout(() => {
            if (!props.expanded[folderId]) {
              props.onToggle(folderId);
            }
          }, 500),
        };
      }
    }
  };

  const handleFolderDrop = (event: React.DragEvent, targetFolder: Folder) => {
    event.preventDefault();
    event.stopPropagation();
    if (autoExpandTimerRef.current?.timer) clearTimeout(autoExpandTimerRef.current.timer);
    props.onDragOverFolder(null);

    const rawFolder =
      event.dataTransfer.getData('text/folder-id') ||
      event.dataTransfer.getData('application/x-folder-id');
    const rawPlain = event.dataTransfer.getData('text/plain') || '';

    let draggedFolderId: string | null = null;
    let docId: string | null = null;

    if (rawFolder) {
      draggedFolderId = rawFolder;
    } else if (rawPlain.startsWith('folder:')) {
      draggedFolderId = rawPlain.replace('folder:', '');
    } else if (rawPlain.startsWith('doc:')) {
      docId = rawPlain.replace('doc:', '');
    } else if (rawPlain) {
      if (props.folders.some((f) => f.id === rawPlain)) {
        draggedFolderId = rawPlain;
      } else {
        docId = rawPlain;
      }
    }

    if (!draggedFolderId && props.draggingFolderId) {
      draggedFolderId = props.draggingFolderId;
    }
    if (!docId && props.draggingDocumentId) {
      docId = props.draggingDocumentId;
    }

    if (draggedFolderId && draggedFolderId !== targetFolder.id) {
      props.onDropFolder?.(targetFolder, draggedFolderId);
    } else if (docId) {
      props.onDropDocument(targetFolder, docId);
    }
  };

  const renderBranch = (parent: string | null, ancestors: Set<string>): React.ReactNode =>
    folders
      .filter((folder) => (parentId(folder) || null) === parent && !ancestors.has(folder.id))
      .map((folder) => {
        const open = !!props.expanded[folder.id];
        const notes = props.documents.filter(
          (document) => document.folderId === folder.id && !document.isTrash
        );
        const hasChildren = folders.some((child) => child.parentId === folder.id);
        const draggingOver = props.dragOverFolderId === folder.id;
        const isDraggingThis = props.draggingFolderId === folder.id;
        const isDescendantOfDragging = props.draggingFolderId ? ancestors.has(props.draggingFolderId) : false;
        const isDropBlocked = isDraggingThis || isDescendantOfDragging;

        const handleFolderDragStart = (event: React.DragEvent) => {
          event.stopPropagation();
          event.dataTransfer.setData('text/plain', `folder:${folder.id}`);
          event.dataTransfer.setData('text/folder-id', folder.id);
          event.dataTransfer.setData('application/x-folder-id', folder.id);
          event.dataTransfer.effectAllowed = 'move';
          props.onDragStartFolder?.(folder.id);
        };

        const handleFolderDragEnd = () => {
          if (autoExpandTimerRef.current?.timer) clearTimeout(autoExpandTimerRef.current.timer);
          props.onDragEndFolder?.();
          props.onDragOverFolder(null);
        };

        return (
          <div key={folder.id} data-folder-id={folder.id} className="space-y-0.5">
            {/* Folder Header Row */}
            <div
              onClick={() => props.onToggle(folder.id)}
              draggable={props.newFolderId !== folder.id}
              onDragStart={handleFolderDragStart}
              onDragEnd={handleFolderDragEnd}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (isDropBlocked) {
                  event.dataTransfer.dropEffect = 'none';
                  return;
                }
                event.dataTransfer.dropEffect = 'move';
                handleFolderHover(folder.id, open);
              }}
              onDragLeave={(event) => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                const x = event.clientX;
                const y = event.clientY;
                if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                  if (props.dragOverFolderId === folder.id) {
                    props.onDragOverFolder(null);
                  }
                }
              }}
              onDrop={(event) => {
                if (isDropBlocked) return;
                handleFolderDrop(event, folder);
              }}
              className={`group flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl text-[var(--ui-text)] transition-all cursor-grab active:cursor-grabbing ${
                isDraggingThis ? 'opacity-30 scale-95 border border-dashed border-[var(--ui-primary)] bg-[var(--ui-hover)]' : ''
              } ${
                draggingOver
                  ? 'bg-[var(--ui-selected)] ring-2 ring-[var(--ui-primary)] font-bold scale-[1.01] shadow-xs'
                  : 'hover:bg-[var(--ui-selected)]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <button
                  type="button"
                  aria-label={`${open ? 'Thu gọn' : 'Mở'} thư mục ${folder.name}`}
                  aria-expanded={open}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onToggle(folder.id);
                  }}
                  className="text-[var(--ui-tertiary)] shrink-0 p-0.5 hover:text-[var(--ui-text)] cursor-pointer"
                >
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <div
                  className="flex items-center gap-1 cursor-grab active:cursor-grabbing shrink-0"
                  title="Kéo thả để di chuyển thư mục"
                >
                  <GripVertical className="w-3 h-3 text-[var(--ui-tertiary)] opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity" />
                  <FolderIcon className={`w-3.5 h-3.5 shrink-0 ${draggingOver ? 'text-[var(--ui-primary)]' : ''}`} strokeWidth={1.75} />
                </div>
                {props.newFolderId === folder.id ? (
                  <NewFolderName
                    folder={folder}
                    onSave={props.onRenameNewFolder}
                    onFinish={props.onFinishNewFolder}
                  />
                ) : (
                  <>
                    <span
                      role="button"
                      tabIndex={0}
                      className="truncate font-medium text-xs text-left cursor-grab active:cursor-grabbing select-none flex-1 min-w-0 hover:text-[var(--ui-primary)]"
                      aria-current={props.view.type === 'folder' && props.view.folderId === folder.id ? 'page' : undefined}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onNavigate({ type: 'folder', folderId: folder.id });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          props.onNavigate({ type: 'folder', folderId: folder.id });
                        }
                      }}
                    >
                      {folder.name}
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="sr-only"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onNavigate({ type: 'folder', folderId: folder.id });
                      }}
                    >
                      {folder.name}
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  title="Tạo thư mục con"
                  aria-label={`Tạo thư mục con trong ${folder.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onCreateFolder(folder.space, folder.id);
                  }}
                  className="p-1 rounded hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Đổi tên thư mục"
                  aria-label={`Đổi tên thư mục ${folder.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onEditFolder(folder);
                  }}
                  className="p-1 rounded hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)] cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Di chuyển thư mục"
                  aria-label={`Di chuyển thư mục ${folder.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onMoveFolder?.(folder);
                  }}
                  className="p-1 rounded hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)] cursor-pointer"
                >
                  <FolderInput className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Xóa thư mục"
                  aria-label={`Xóa thư mục ${folder.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onDeleteFolder(folder.id);
                  }}
                  className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-[var(--ui-muted)] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Folder Open Contents Area (also accepts drops) */}
            {open && (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (isDropBlocked) {
                    event.dataTransfer.dropEffect = 'none';
                    return;
                  }
                  event.dataTransfer.dropEffect = 'move';
                  handleFolderHover(folder.id, true);
                }}
                onDrop={(event) => {
                  if (isDropBlocked) return;
                  handleFolderDrop(event, folder);
                }}
                className={`pl-3 space-y-0.5 border-l ml-3.5 my-0.5 transition-all ${
                  draggingOver
                    ? 'border-[var(--ui-primary)] bg-[var(--ui-selected)]/50 rounded-r-xl ring-1 ring-[var(--ui-primary)]/40'
                    : 'border-[var(--ui-border)]'
                }`}
              >
                {renderBranch(folder.id, new Set([...ancestors, folder.id]))}
                {notes.map((document) => props.renderDocument(document, folder.id))}
                {!hasChildren && !notes.length && (
                  <p className="text-[10px] text-[var(--ui-tertiary)] italic px-2 py-1.5 rounded-lg border border-dashed border-[var(--ui-border)] text-center my-1">
                    Thư mục trống • Kéo thả tệp hoặc thư mục vào đây
                  </p>
                )}
              </div>
            )}
          </div>
        );
      });

  return <>{renderBranch(null, new Set())}</>;
}
