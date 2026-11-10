import { SpaceCreateMenu } from './SpaceCreateMenu';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Folder as FolderIcon, FolderOpen, FolderInput, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Document, Folder, SpaceType, ViewState } from '../../types';
import {
  canDropFolderInto,
  clearActiveDrag,
  getDragPayload,
  setDragFolder,
  useActiveDrag,
} from '../../utils/dnd';

interface Props {
  folders: Folder[];
  documents: Document[];
  space: SpaceType;
  view: ViewState;
  expanded: Record<string, boolean>;
  dragOverFolderId: string | null;
  onToggle: (id: string) => void;
  onNavigate: (view: ViewState) => void;
  onCreateDocument?: (space: SpaceType, folderId?: string | null) => void;
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

function NewFolderName({
  folder,
  onSave,
  onFinish,
}: {
  folder: Folder;
  onSave: (folder: Folder, name: string) => void;
  onFinish: () => void;
}) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    inputRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  const save = () => {
    if (finished.current) return;
    try {
      onSave(folder, name.trim() || folder.name);
      finished.current = true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không lưu được tên thư mục.');
    }
  };

  return (
    <span className="min-w-0 flex-1">
      <input
        ref={inputRef}
        aria-label="Tên thư mục mới"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onBlur={save}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            finished.current = true;
            onFinish();
          }
        }}
        className="w-full min-w-0 px-1 py-0.5 rounded border border-[var(--ui-accent)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] outline-none"
      />
      {error && <span role="alert" className="block text-[10px] text-red-600">{error}</span>}
    </span>
  );
}

export function FolderTree(props: Props) {
  const { isDraggingFolder, draggedId } = useActiveDrag();
  const folders = props.folders.filter((folder) => folder.space === props.space);
  const parentId = (folder: Folder) =>
    folders.some((parent) => parent.id === folder.parentId) ? folder.parentId : null;

  const autoExpandTimerRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const cancelAutoExpand = () => {
    if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current.timer);
    autoExpandTimerRef.current = null;
  };

  useEffect(() => cancelAutoExpand, []);

  const handleFolderHover = (folderId: string, isOpen: boolean) => {
    if (props.dragOverFolderId !== folderId) {
      props.onDragOverFolder(folderId);
    }
    if (isOpen) cancelAutoExpand();
    if (!isOpen) {
      if (autoExpandTimerRef.current?.id !== folderId) {
        if (autoExpandTimerRef.current?.timer) clearTimeout(autoExpandTimerRef.current.timer);
        autoExpandTimerRef.current = {
          id: folderId,
          timer: setTimeout(() => {
            autoExpandTimerRef.current = null;
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
    cancelAutoExpand();
    props.onDragOverFolder(null);

    const payload = getDragPayload(event, props.folders, props.documents);
    clearActiveDrag();
    props.onDragEndFolder?.();
    if (!payload) return;

    if (payload.type === 'folder') {
      if (!canDropFolderInto(payload.id, targetFolder.id, props.folders)) {
        return;
      }
      props.onDropFolder?.(targetFolder, payload.id);
    } else if (payload.type === 'document') {
      props.onDropDocument(targetFolder, payload.id);
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

        const currentDraggedFolderId = (isDraggingFolder ? draggedId : null) || props.draggingFolderId || null;
        const isDraggingThis = currentDraggedFolderId === folder.id;
        const isDropBlocked =
          !!currentDraggedFolderId && !canDropFolderInto(currentDraggedFolderId, folder.id, props.folders);
        const draggingOver = props.dragOverFolderId === folder.id && !isDropBlocked;

        const handleFolderDragStart = (event: React.DragEvent) => {
          event.stopPropagation();
          setDragFolder(event, folder.id);
          props.onDragStartFolder?.(folder.id);
        };

        const handleFolderDragEnd = () => {
          cancelAutoExpand();
          clearActiveDrag();
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
                  cancelAutoExpand();
                  props.onDragOverFolder(null);
                  event.dataTransfer.dropEffect = 'none';
                  return;
                }
                event.dataTransfer.dropEffect = 'move';
                handleFolderHover(folder.id, open);
              }}
              onDragLeave={(event) => {
                event.stopPropagation();
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  cancelAutoExpand();
                  if (props.dragOverFolderId === folder.id) {
                    props.onDragOverFolder(null);
                  }
                }
              }}
              onDrop={(event) => {
                handleFolderDrop(event, folder);
              }}
              className={`group flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl text-[var(--ui-text)] transition-colors select-none ${
                isDropBlocked ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'
              } ${
                isDraggingThis
                  ? 'opacity-50 bg-[var(--ui-hover)]'
                  : ''
              } ${
                draggingOver
                  ? 'bg-[var(--ui-selected)] ring-2 ring-[var(--ui-primary)] text-[var(--ui-primary)] font-bold scale-[1.01] shadow-xs'
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
                  {draggingOver || open ? (
                    <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${draggingOver ? 'text-[var(--ui-primary)]' : ''}`} strokeWidth={1.75} />
                  ) : (
                    <FolderIcon className={`w-3.5 h-3.5 shrink-0 ${draggingOver ? 'text-[var(--ui-primary)]' : ''}`} strokeWidth={1.75} />
                  )}
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
                    {draggingOver && (
                      <span className="text-[10px] bg-[var(--ui-primary)] text-white px-1.5 py-0.2 rounded font-medium shrink-0 animate-in fade-in duration-100">
                        Thả vào đây
                      </span>
                    )}
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
                <SpaceCreateMenu title={`Tạo thư mục con trong ${folder.name}`}
                  onCreateDocument={() => props.onCreateDocument?.(folder.space, folder.id)}
                  onCreateFolder={() => props.onCreateFolder(folder.space, folder.id)} />
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

            {/* Folder Open Contents Area */}
            {open && (
              <div
                className={`pl-3 space-y-0.5 border-l ml-3.5 my-0.5 transition-all border-[var(--ui-border)]`}
              >
                {renderBranch(folder.id, new Set([...ancestors, folder.id]))}
                {notes.map((document) => props.renderDocument(document, folder.id))}
                {!hasChildren && !notes.length && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isDropBlocked) {
                        e.dataTransfer.dropEffect = 'none';
                        return;
                      }
                      e.dataTransfer.dropEffect = 'move';
                      if (props.dragOverFolderId !== folder.id) props.onDragOverFolder(folder.id);
                    }}
                    onDrop={(e) => {
                      handleFolderDrop(e, folder);
                    }}
                    className={`text-[10px] italic px-2 py-2 rounded-lg border border-dashed transition-colors text-center my-1 ${
                      props.dragOverFolderId === folder.id
                        ? 'border-[var(--ui-primary)] bg-[var(--ui-selected)] text-[var(--ui-primary)] font-medium'
                        : 'border-[var(--ui-border)] text-[var(--ui-tertiary)]'
                    }`}
                  >
                    Thư mục trống • Kéo thả tệp hoặc thư mục vào đây
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });

  return <>{renderBranch(null, new Set())}</>;
}
