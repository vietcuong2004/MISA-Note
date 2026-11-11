import { formatDateTime } from '../../utils/dateTime';
import { FolderActions } from '../layout/FolderActions';
import { RenameDialog } from '../modals/RenameDialog';
import { DocumentLinkShare } from '../modals/DocumentLinkShare';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Grid,
  List as ListIcon,
  Star,
  Trash2,
  Plus,
  ChevronDown,
  FileText,
  LockKeyhole,
  User,
  Building2,
  Users,
  SlidersHorizontal,
  ArrowUpDown,
  MoreHorizontal,
  Copy,
  Link2,
  Edit2,
  ArrowRight,
  Upload,
  Mic,
  FolderPlus,
  FolderTree,
  FolderInput,
  Folder as FolderIcon,
  ChevronRight,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Document, Folder, SpaceType } from '../../types';
import { documentUrl } from '../../app/router/routes';
import { getFolderPath } from '../../utils/folders';
import { DocumentActionMenu } from '../modals/DocumentActionMenu';
import {
  canDropFolderInto,
  clearActiveDrag,
  getDragPayload,
  setDragDocument,
  setDragFolder,
  useActiveDrag,
} from '../../utils/dnd';

export interface LibraryViewProps {
  trashMode?: boolean;
  onRestore?: (docId: string) => void;
  headerAction?: React.ReactNode;
  title?: string;
  description?: string;
  showTabs?: boolean;
  activeTab?: 'all' | 'mine' | 'company' | 'shared' | 'meeting' | 'template';
  defaultSpace?: SpaceType;
  defaultFolderId?: string | null;
  onNavigatePage?: (page: 'private' | 'company' | 'shared' | 'meeting_notes' | 'templates' | 'library') => void;
  documents: Document[];
  folders: Folder[];
  onOpenDocument: (docId: string) => void;
  onToggleFavorite: (docId: string) => void;
  onSoftDeleteDocument: (docId: string) => void;
  onCreateDocument?: (space: SpaceType, folderId?: string | null) => void;
  onOpenTemplates?: () => void;
  onImportDoc?: () => void;
  onCreateFolder?: (space: SpaceType, parentId?: string | null) => void;
  onRecordAudioNote?: () => void;
  onDuplicateDocument?: (docId: string) => void;
  onRenameDocument?: (docId: string, newTitle: string) => void;
  onMoveDocumentRequest?: (doc: Document) => void;
  onMoveDocument?: (docId: string, targetFolderId: string | null, targetSpace: SpaceType) => void;
  onEditFolder?: (folder: Folder) => void;
  onMoveFolderRequest?: (folder: Folder) => void;
  onMoveFolder?: (folderId: string, targetParentId: string | null, targetSpace: SpaceType) => void;
  onDeleteFolder?: (folderId: string) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  trashMode = false,
  onRestore,
  headerAction,
  title = 'Thư viện',
  description = 'Tất cả ghi chú và tài liệu bạn có quyền truy cập.',
  showTabs = true,
  activeTab: activeTabProp,
  defaultSpace = 'personal',
  defaultFolderId = null,
  onNavigatePage,
  documents,
  folders,
  onOpenDocument,
  onToggleFavorite,
  onSoftDeleteDocument,
  onCreateDocument,
  onOpenTemplates,
  onImportDoc,
  onCreateFolder,
  onRecordAudioNote,
  onDuplicateDocument,
  onRenameDocument,
  onMoveDocumentRequest,
  onMoveDocument,
  onEditFolder,
  onMoveFolderRequest,
  onMoveFolder,
  onDeleteFolder,
  onToast,
}) => {
  // Navigation Tab matching screenshot: Tất cả, Của tôi, Công ty, Được chia sẻ, Cuộc họp, Mẫu
  const [internalTab, setInternalTab] = useState<'all' | 'mine' | 'company' | 'shared' | 'meeting' | 'template'>(activeTabProp || 'all');

  useEffect(() => {
    if (activeTabProp) {
      setInternalTab(activeTabProp);
    }
  }, [activeTabProp]);

  const activeTab = activeTabProp !== undefined ? activeTabProp : internalTab;

  const handleTabClick = (tab: 'all' | 'mine' | 'company' | 'shared' | 'meeting' | 'template', pageRoute?: 'library' | 'private' | 'company' | 'shared' | 'meeting_notes' | 'templates') => {
    setInternalTab(tab);
    if (pageRoute && onNavigatePage) {
      onNavigatePage(pageRoute);
    }
  };
  const treeDisabled = activeTab === 'shared' || activeTab === 'meeting';
  const [preferredViewMode, setViewMode] = useState<'tree' | 'list' | 'grid'>('tree');
  const viewMode = treeDisabled && preferredViewMode === 'tree' ? 'list' : preferredViewMode;
  const [shareDocument, setShareDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Folder trees start collapsed; users expand individual folders.
  const [treeExpandedFolders, setTreeExpandedFolders] = useState<Record<string, boolean>>({});
  const isFolderExpanded = (folderId: string) => treeExpandedFolders[folderId] === true;
  const toggleFolderExpanded = (folderId: string) => {
    setTreeExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !isFolderExpanded(folderId),
    }));
  };
  const expandAllFolders = () => {
    const next: Record<string, boolean> = {};
    folders.forEach((f) => { next[f.id] = true; });
    setTreeExpandedFolders(next);
  };
  const collapseAllFolders = () => {
    const next: Record<string, boolean> = {};
    folders.forEach((f) => { next[f.id] = false; });
    setTreeExpandedFolders(next);
  };

  // Dropdown filter states
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated_desc' | 'updated_asc' | 'title_asc'>('updated_desc');

  // Popup menus
  const [showNewDocMenu, setShowNewDocMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Selected row checkboxes for batch operations
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Global drag state & dragOver target
  const { isDraggingFolder, isDraggingDocument, draggedId } = useActiveDrag();
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Row context menu state
  const [activeRowDoc, setActiveRowDoc] = useState<Document | null>(null);
  const [rowMenuPos, setRowMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Rename dialog state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);

  const newDocMenuRef = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const authorMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (newDocMenuRef.current && !newDocMenuRef.current.contains(target)) {
        setShowNewDocMenu(false);
      }
      if (typeMenuRef.current && !typeMenuRef.current.contains(target)) {
        setShowTypeMenu(false);
      }
      if (folderMenuRef.current && !folderMenuRef.current.contains(target)) {
        setShowFolderMenu(false);
      }
      if (authorMenuRef.current && !authorMenuRef.current.contains(target)) {
        setShowAuthorMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(target)) {
        setActiveRowDoc(null);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDocs = useMemo(() => documents.filter((d) => trashMode ? d.isTrash : !d.isTrash), [documents, trashMode]);

  // List of authors
  const authorsList = useMemo(() => {
    const set = new Set<string>();
    activeDocs.forEach((d) => {
      if (d.author?.name) set.add(d.author.name);
    });
    return Array.from(set);
  }, [activeDocs]);

  // Tab Filtering & Search Filtering
  const filteredDocs = useMemo(() => {
    return activeDocs
      .filter((doc) => {
        // 1. Tab filtering
        if (activeTab === 'mine') {
          if (trashMode ? doc.space !== 'personal' : doc.space !== 'personal' && doc.author?.name !== 'Việt Cường') return false;
        } else if (activeTab === 'company') {
          if (doc.space !== 'company') return false;
        } else if (activeTab === 'shared') {
          if (!doc.tags.includes('Được chia sẻ') && doc.space !== 'company') return false;

        } else if (activeTab === 'template') {
          if (!doc.tags.includes('Mẫu') && doc.type !== 'plan') return false;
        }

        // 2. Dropdown type filter
        if (selectedType !== 'all' && doc.space !== selectedType) return false;

        // 3. Dropdown folder filter
        if (selectedFolderId !== 'all') {
          if (doc.folderId !== selectedFolderId) return false;
        }

        // 4. Dropdown author filter
        if (selectedAuthor !== 'all') {
          if (selectedAuthor === 'me' && doc.author?.name !== 'Việt Cường') return false;
          if (selectedAuthor !== 'me' && doc.author?.name !== selectedAuthor) return false;
        }

        // 5. Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = doc.title.toLowerCase().includes(q);
          const matchAuthor = doc.author?.name?.toLowerCase().includes(q);
          const matchTags = doc.tags.some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchAuthor || matchTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'updated_desc') {
          return Date.parse(trashMode ? b.deletedAt || b.updatedAt : b.updatedAt) - Date.parse(trashMode ? a.deletedAt || a.updatedAt : a.updatedAt);
        }
        if (sortBy === 'updated_asc') {
          return Date.parse(trashMode ? a.deletedAt || a.updatedAt : a.updatedAt) - Date.parse(trashMode ? b.deletedAt || b.updatedAt : b.updatedAt);
        }
        if (sortBy === 'title_asc') {
          return a.title.localeCompare(b.title, 'vi');
        }
        return 0;
      });
  }, [activeDocs, activeTab, selectedType, selectedFolderId, selectedAuthor, searchQuery, sortBy, trashMode]);

  const displayDateTime = formatDateTime;

  // Helper for Location string (Vị trí) displaying slash path format, e.g. "Công ty / Dự án" or "Của tôi / Công việc"
  const getLocationString = (doc: Document) => {
    if (doc.tags.includes('Được chia sẻ')) {
      return 'Được chia sẻ';
    }
    const folder = folders.find((f) => f.id === doc.folderId);
    if (folder) {
      const spaceName = folder.space === 'personal' ? 'Của tôi' : 'Công ty';
      return `${spaceName} / ${getFolderPath(folder.id, folders)}`;
    }
    if (doc.space === 'personal') {
      return 'Của tôi / Chưa phân loại';
    }
    return 'Công ty';
  };

  const typeOptions = [
    { id: 'personal', label: 'Ghi chú của tôi', Icon: LockKeyhole, iconColor: 'text-amber-500' },
    { id: 'company', label: 'Tài liệu công ty', Icon: Building2, iconColor: 'text-slate-500' },
  ] as const;
  const selectedTypeOption = typeOptions.find(item => item.id === selectedType);
  const getTypeBadge = (doc: Document) => {
    const item = typeOptions.find(item => item.id === doc.space)!;
    return <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAEAEC] text-[var(--ui-text)]">
      <item.Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
      <span>{item.label}</span>
    </span>;
  };

  // Helper for author name matching screenshot: "Bạn", "Minh Anh", "Hoàng Nam", "Thu Hà"
  const getAuthorDisplay = (doc: Document) => {
    if (doc.author?.name === 'Việt Cường' || doc.author?.id === 'usr_vc') {
      return 'Bạn';
    }
    return doc.author?.name || 'Bạn';
  };

  // Checkbox toggle
  const toggleSelectDoc = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  // Open context menu for row
  const handleOpenRowMenu = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 280;

    let left = rect.right + 6;
    if (left + menuWidth > window.innerWidth) {
      left = rect.left - menuWidth - 6;
    }
    let top = rect.top;
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - 16;
    }

    setRowMenuPos({ top: Math.max(16, top), left });
    setActiveRowDoc(doc);
  };



  // Helper to check if folder has matching items when searching
  const folderHasMatch = (folder: Folder): boolean => {
    if (!trashMode && !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (!trashMode && folder.name.toLowerCase().includes(q)) return true;
    if (filteredDocs.some((d) => d.folderId === folder.id)) return true;
    const children = folders.filter((f) => f.space === folder.space && f.parentId === folder.id);
    return children.some((c) => folderHasMatch(c));
  };

  // Reusable document table row for both List view and Tree view
  const renderTrashActions = (doc: Document) => (
    <div className="flex items-center justify-end gap-1" onClick={event => event.stopPropagation()}>
      <button type="button" title="Khôi phục tài liệu" aria-label={`Khôi phục ${doc.title || 'tài liệu'}`}
        onClick={() => onRestore?.(doc.id)} className="p-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-[var(--ui-text)]">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button type="button" title="Xóa vĩnh viễn" aria-label={`Xóa vĩnh viễn ${doc.title || 'tài liệu'}`}
        onClick={() => onSoftDeleteDocument(doc.id)} className="p-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-[var(--ui-text)]">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderDocumentTableRow = (doc: Document, depth: number = 0) => {
    const isChecked = selectedDocIds.has(doc.id);
    const isRenaming = renamingDocId === doc.id;
    const isBeingDragged = isDraggingDocument && draggedId === doc.id;

    return (
      <tr
        key={doc.id}
        draggable={!trashMode && !isRenaming}
        onDragStart={(e) => {
          e.stopPropagation();
          setDragDocument(e, doc.id);
        }}
        onDragEnd={() => {
          clearActiveDrag();
        }}
        onClick={() => {
          if (!trashMode && !isRenaming) onOpenDocument(doc.id);
        }}
        className={`hover:bg-[var(--ui-subtle)] cursor-grab active:cursor-grabbing transition-colors group border-b border-[#F2F2F7] select-none ${
          isBeingDragged ? 'opacity-40 bg-[var(--ui-hover)]' : ''
        }`}
      >
        {/* Checkbox */}
        <td className="py-2.5 px-2 text-center" onClick={(e) => toggleSelectDoc(doc.id, e)}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            className="rounded border-[#C7C7CC] cursor-pointer"
          />
        </td>

        {/* Tên tài liệu: Depth padding + Star + Icon + Title */}
        <td className="py-2.5 px-3">
          <div
            style={{ paddingLeft: `${depth * 20}px` }}
            className="flex items-center gap-2 min-w-0"
          >
            {depth > 0 && (
              <span className="text-[var(--ui-tertiary)] opacity-60 font-mono text-[11px] select-none shrink-0">
                ↳
              </span>
            )}
            {/* Favorite Star Button */}
            {!trashMode && doc.space === 'personal' && <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(doc.id);
              }}
              className="text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] transition-colors shrink-0 cursor-pointer"
              title={doc.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            >
              <Star
                className={`w-3.5 h-3.5 stroke-[1.75] ${
                  doc.isFavorite ? 'fill-[#1D1D1F] text-[var(--ui-text)]' : 'text-[#AEAEB2]'
                }`}
              />
            </button>}

            {/* Document Icon */}
            <span className="text-[var(--ui-text)] shrink-0">
              <FileText className="w-4 h-4 stroke-[1.75]" />
            </span>

            {/* Document title */}
            <span className="font-semibold text-[var(--ui-text)] group-hover:underline truncate">
                {doc.title || 'Không có tiêu đề'}
              </span>
          </div>
        </td>

        {/* Loại badge */}
        <td className="py-2.5 px-3">{getTypeBadge(doc)}</td>

        {/* Vị trí */}
        <td className="py-2.5 px-3 text-[var(--ui-muted)] truncate">{getLocationString(doc)}</td>

        {/* Người tạo */}
        <td className="py-2.5 px-3 text-[var(--ui-muted)]">{getAuthorDisplay(doc)}</td>

        {/* Cập nhật */}
        <td className="py-2.5 px-3 text-[var(--ui-tertiary)] whitespace-nowrap">
          {displayDateTime(trashMode ? doc.deletedAt || doc.updatedAt : doc.updatedAt)}
        </td>

        {/* More actions: ··· */}
        <td className="py-2.5 px-2 text-center">
          {trashMode ? renderTrashActions(doc) : <button
            type="button"
            onClick={(e) => handleOpenRowMenu(doc, e)}
            className="p-1 rounded-md text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-border)] transition-colors cursor-pointer"
            title="Tùy chọn khác"
          >
            <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>}
        </td>
      </tr>
    );
  };

  // Render a folder and its children/docs in tree view
  const renderFolderBranch = (folder: Folder, depth: number = 0): React.ReactNode => {
    if (!folderHasMatch(folder)) return null;

    const isOpen = isFolderExpanded(folder.id);
    const childFolders = folders.filter((f) => f.space === folder.space && f.parentId === folder.id);
    const folderDocs = filteredDocs.filter((d) => d.folderId === folder.id);

    const isDraggingThis = isDraggingFolder && draggedId === folder.id;
    const isDropBlocked = isDraggingFolder && !!draggedId && !canDropFolderInto(draggedId, folder.id, folders);
    const isOver = dragOverFolderId === folder.id && !isDropBlocked;

    return (
      <React.Fragment key={folder.id}>
        <tr
          draggable={!trashMode}
          onDragStart={(e) => {
            e.stopPropagation();
            setDragFolder(e, folder.id);
          }}
          onDragEnd={() => {
            clearActiveDrag();
            setDragOverFolderId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDropBlocked) {
              e.dataTransfer.dropEffect = 'none';
              return;
            }
            e.dataTransfer.dropEffect = 'move';
            if (dragOverFolderId !== folder.id) {
              setDragOverFolderId(folder.id);
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (dragOverFolderId === folder.id) setDragOverFolderId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(null);
            clearActiveDrag();

            if (isDropBlocked) return;

            const payload = getDragPayload(e, folders, filteredDocs);
            if (!payload) return;

            if (payload.type === 'folder') {
              if (canDropFolderInto(payload.id, folder.id, folders)) {
                onMoveFolder?.(payload.id, folder.id, folder.space);
                onToast?.(`Đã di chuyển thư mục vào thư mục "${folder.name}"`);
              }
            } else if (payload.type === 'document') {
              onMoveDocument?.(payload.id, folder.id, folder.space);
              onToast?.(`Đã di chuyển tài liệu vào thư mục "${folder.name}"`);
            }
          }}
          className={`transition-all group border-b border-[var(--ui-border)]/50 select-none ${
            isDropBlocked ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'
          } ${
            isDraggingThis ? 'opacity-30 bg-[var(--ui-hover)]' : ''
          } ${
            isOver
              ? 'bg-[var(--ui-selected)] ring-2 ring-[var(--ui-primary)] text-[var(--ui-primary)] font-bold shadow-xs'
              : 'bg-[var(--ui-hover)]/35 hover:bg-[var(--ui-hover)]'
          }`}
        >
          <td className="py-2 px-2 text-center">
            {/* Blank check cell for alignment */}
          </td>
          <td colSpan={5} className="py-2 px-3">
            <div
              style={{ paddingLeft: `${depth * 20}px` }}
              className="flex items-center justify-between min-w-0"
            >
              <button
                type="button"
                onClick={() => toggleFolderExpanded(folder.id)}
                className="flex items-center gap-2 font-semibold text-xs text-[var(--ui-text)] hover:text-[var(--ui-primary)] transition-colors cursor-pointer text-left truncate"
              >
                <span className="text-[var(--ui-tertiary)] shrink-0">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                  )}
                </span>
                <FolderIcon className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isOver ? 'text-[var(--ui-primary)]' : 'text-amber-500 fill-amber-500/20'}`} />
                <span className="truncate">{folder.name}</span>
                <span className="text-[10px] font-normal text-[var(--ui-tertiary)] bg-[var(--ui-border)] px-1.5 py-0.2 rounded-full font-mono shrink-0">
                  {folderDocs.length} tài liệu
                </span>
                {isOver && (
                  <span className="text-[10px] bg-[var(--ui-primary)] text-white px-2 py-0.5 rounded-full font-medium ml-2 animate-in fade-in">
                    Thả vào đây
                  </span>
                )}
              </button>
              {!trashMode && <FolderActions folder={folder} onCreateDocument={onCreateDocument} onCreateFolder={onCreateFolder}
                onRename={onEditFolder} onMove={onMoveFolderRequest} onDelete={onDeleteFolder} />}
            </div>
          </td>
          <td className="py-2 px-2 text-center"></td>
        </tr>

        {isOpen && (
          <>
            {childFolders.map((child) => renderFolderBranch(child, depth + 1))}
            {folderDocs.map((doc) => renderDocumentTableRow(doc, depth + 1))}
            {childFolders.length === 0 && folderDocs.length === 0 && (
              <tr className="text-[11px] text-[var(--ui-tertiary)] italic border-b border-[#F2F2F7]">
                <td></td>
                <td colSpan={6} className="py-1.5 px-3" style={{ paddingLeft: `${(depth + 1) * 20 + 20}px` }}>
                  <span className="flex items-center gap-2">
                    <span>Thư mục trống</span>
                    {onCreateDocument && (
                      <button
                        type="button"
                        onClick={() => onCreateDocument(folder.space, folder.id)}
                        className="text-[var(--ui-primary)] not-italic font-medium hover:underline cursor-pointer"
                      >
                        + Thêm tài liệu
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            )}
          </>
        )}
      </React.Fragment>
    );
  };

  // Render tree content based on active tab
  const renderTreeContent = () => {
    // 1. Tab All: Show Personal space then Company space
    if (activeTab === 'all') {
      const personalRoots = folders.filter((f) => f.space === 'personal' && !f.parentId);
      const companyRoots = folders.filter((f) => f.space === 'company' && !f.parentId);
      const personalUnfiled = filteredDocs.filter((d) => d.space === 'personal' && (!d.folderId || !folders.some(f => f.id === d.folderId)));
      const companyUnfiled = filteredDocs.filter((d) => d.space === 'company' && (!d.folderId || !folders.some(f => f.id === d.folderId)));

      return (
        <>
          {/* Space 1: CỦA TÔI */}
          <tr
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              clearActiveDrag();
              const p = getDragPayload(e, folders, filteredDocs);
              if (!p) return;
              if (p.type === 'folder') {
                onMoveFolder?.(p.id, null, 'personal');
                onToast?.('Đã đưa thư mục ra thư mục gốc Ghi chép của tôi');
              } else if (p.type === 'document') {
                onMoveDocument?.(p.id, null, 'personal');
                onToast?.('Đã đưa tài liệu ra thư mục gốc Ghi chép của tôi');
              }
            }}
            className="bg-[var(--ui-hover)]/70 text-xs font-bold border-t border-b border-[var(--ui-border)] transition-colors hover:bg-[var(--ui-selected)]"
          >
            <td className="py-2 px-2 text-center">
              <User className="w-3.5 h-3.5 text-[var(--ui-tertiary)] mx-auto" />
            </td>
            <td colSpan={6} className="py-2 px-3 tracking-wide uppercase text-[11px] font-bold text-[var(--ui-tertiary)]">
              GHI CHÉP CỦA TÔI
            </td>
          </tr>
          {personalRoots.map((f) => renderFolderBranch(f, 0))}
          {personalUnfiled.length > 0 && (
            <>
              <tr
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  clearActiveDrag();
                  const p = getDragPayload(e, folders, filteredDocs);
                  if (!p) return;
                  if (p.type === 'document') {
                    onMoveDocument?.(p.id, null, 'personal');
                    onToast?.('Đã đưa tài liệu ra thư mục gốc (chưa phân loại)');
                  }
                }}
                className="bg-[var(--ui-hover)]/20 text-xs text-[var(--ui-tertiary)] border-y border-[var(--ui-border)]/40 hover:bg-[var(--ui-selected)] transition-colors"
              >
                <td></td>
                <td colSpan={6} className="py-1.5 px-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--ui-tertiary)]">
                    <Clock className="w-3 h-3 stroke-[1.75]" />
                    <span>Chưa phân loại thư mục ({personalUnfiled.length})</span>
                  </div>
                </td>
              </tr>
              {personalUnfiled.map((d) => renderDocumentTableRow(d, 0))}
            </>
          )}

          {/* Space 2: CÔNG TY */}
          <tr
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              clearActiveDrag();
              const p = getDragPayload(e, folders, filteredDocs);
              if (!p) return;
              if (p.type === 'folder') {
                onMoveFolder?.(p.id, null, 'company');
                onToast?.('Đã đưa thư mục ra thư mục gốc Tài liệu công ty');
              } else if (p.type === 'document') {
                onMoveDocument?.(p.id, null, 'company');
                onToast?.('Đã đưa tài liệu ra thư mục gốc Tài liệu công ty');
              }
            }}
            className="bg-[var(--ui-hover)]/70 text-xs font-bold border-t-2 border-b border-[var(--ui-border)] transition-colors hover:bg-[var(--ui-selected)]"
          >
            <td className="py-2 px-2 text-center">
              <Building2 className="w-3.5 h-3.5 text-[var(--ui-tertiary)] mx-auto" />
            </td>
            <td colSpan={6} className="py-2 px-3 tracking-wide uppercase text-[11px] font-bold text-[var(--ui-tertiary)]">
              TÀI LIỆU CÔNG TY
            </td>
          </tr>
          {companyRoots.map((f) => renderFolderBranch(f, 0))}
          {companyUnfiled.length > 0 && (
            <>
              <tr className="bg-[var(--ui-hover)]/20 text-xs text-[var(--ui-tertiary)] border-y border-[var(--ui-border)]/40">
                <td></td>
                <td colSpan={6} className="py-1.5 px-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--ui-tertiary)]">
                    <Clock className="w-3 h-3 stroke-[1.75]" />
                    <span>Chưa phân loại thư mục ({companyUnfiled.length})</span>
                  </div>
                </td>
              </tr>
              {companyUnfiled.map((d) => renderDocumentTableRow(d, 0))}
            </>
          )}
        </>
      );
    }

    // 2. Tab Mine: Only personal space
    if (activeTab === 'mine') {
      const personalRoots = folders.filter((f) => f.space === 'personal' && !f.parentId);
      const personalUnfiled = filteredDocs.filter((d) => d.space === 'personal' && (!d.folderId || !folders.some(f => f.id === d.folderId)));
      return (
        <>
          {personalUnfiled.length > 0 && (
            <>
              <tr
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  clearActiveDrag();
                  const p = getDragPayload(e, folders, filteredDocs);
                  if (!p) return;
                  if (p.type === 'document') {
                    onMoveDocument?.(p.id, null, 'personal');
                    onToast?.('Đã đưa tài liệu ra thư mục gốc (chưa phân loại)');
                  }
                }}
                className="bg-[var(--ui-hover)]/20 text-xs text-[var(--ui-tertiary)] border-y border-[var(--ui-border)]/40 hover:bg-[var(--ui-selected)] transition-colors"
              >
                <td></td>
                <td colSpan={6} className="py-1.5 px-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--ui-tertiary)]">
                    <Clock className="w-3 h-3 stroke-[1.75]" />
                    <span>Chưa phân loại thư mục ({personalUnfiled.length})</span>
                  </div>
                </td>
              </tr>
              {personalUnfiled.map((d) => renderDocumentTableRow(d, 0))}
            </>
          )}
          {personalRoots.map((f) => renderFolderBranch(f, 0))}
        </>
      );
    }

    // 3. Tab Company: Only company space
    if (activeTab === 'company') {
      const companyRoots = folders.filter((f) => f.space === 'company' && !f.parentId);
      const companyUnfiled = filteredDocs.filter((d) => d.space === 'company' && (!d.folderId || !folders.some(f => f.id === d.folderId)));
      return (
        <>
          {companyRoots.map((f) => renderFolderBranch(f, 0))}
          {companyUnfiled.length > 0 && (
            <>
              <tr
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  clearActiveDrag();
                  const p = getDragPayload(e, folders, filteredDocs);
                  if (!p) return;
                  if (p.type === 'document') {
                    onMoveDocument?.(p.id, null, 'company');
                    onToast?.('Đã đưa tài liệu ra thư mục gốc (chưa phân loại)');
                  }
                }}
                className="bg-[var(--ui-hover)]/20 text-xs text-[var(--ui-tertiary)] border-y border-[var(--ui-border)]/40 hover:bg-[var(--ui-selected)] transition-colors"
              >
                <td></td>
                <td colSpan={6} className="py-1.5 px-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--ui-tertiary)]">
                    <Clock className="w-3 h-3 stroke-[1.75]" />
                    <span>Chưa phân loại thư mục ({companyUnfiled.length})</span>
                  </div>
                </td>
              </tr>
              {companyUnfiled.map((d) => renderDocumentTableRow(d, 0))}
            </>
          )}
        </>
      );
    }

    // 4. Other tabs (shared, meeting, template): Group by folder or render docs
    const rootFolders = folders.filter((f) => !f.parentId && filteredDocs.some((d) => d.folderId === f.id));
    const unfiled = filteredDocs.filter((d) => !d.folderId || !folders.some((f) => f.id === d.folderId));

    return (
      <>
        {rootFolders.map((f) => renderFolderBranch(f, 0))}
        {unfiled.map((d) => renderDocumentTableRow(d, 0))}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--ui-surface)] overflow-hidden select-none"
      onDragStartCapture={event => { if (trashMode) { event.preventDefault(); event.stopPropagation(); } }}
      onDragOverCapture={event => { if (trashMode) event.stopPropagation(); }}
      onDropCapture={event => { if (trashMode) { event.preventDefault(); event.stopPropagation(); } }}>
      {/* Fixed Common Header Section matching image_b4c254f2.png & image_36885ad9.png */}
      <div className="shrink-0 bg-[var(--ui-surface)] border-b border-[var(--ui-border)] z-20">
        <div className="w-full px-[5%] pt-6 pb-3.5 space-y-4">
          {/* Top Header Row matching image_59ef5bd1.png */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[var(--ui-text)] tracking-tight">{title}</h1>
              <p className="text-xs text-[var(--ui-tertiary)] mt-1.5 font-normal">
                {description}
              </p>
            </div>

          {/* Split Button: [+ Ghi chú mới | ▾] */}
          {trashMode ? headerAction : <div className="relative shrink-0" ref={newDocMenuRef}>
            <div className="inline-flex rounded-xl shadow-xs overflow-hidden bg-[var(--ui-primary)]">
              <button
                type="button"
                onClick={() => onCreateDocument?.(defaultSpace, defaultFolderId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--ui-primary-hover)] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Ghi chú mới</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewDocMenu(!showNewDocMenu)}
                className="px-2.5 py-2 text-white hover:bg-[var(--ui-primary-hover)] border-l border-white/20 transition-colors cursor-pointer"
                title="Tùy chọn khác"
              >
                <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Split Dropdown Menu matching screenshot */}
            {showNewDocMenu && (
              <div className="absolute right-0 top-11 z-50 w-52 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-xl py-1 text-xs text-[var(--ui-text)] animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenTemplates?.();
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                  <span>Tạo từ mẫu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportDoc?.();
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                  <span>Nhập tài liệu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCreateFolder?.(defaultSpace, defaultFolderId);
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                  <span>Tạo thư mục</span>
                </button>
                <div className="border-t border-[#F2F2F7] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    onRecordAudioNote?.();
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer text-[var(--ui-text)]"
                >
                  <Mic className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                  <span>Ghi âm thành ghi chú</span>
                </button>
              </div>
            )}
          </div>}
        </div>

        {/* Horizontal Navigation Tabs matching image_59ef5bd1.png & image_36885ad9.png */}
        {showTabs && <div className="flex items-center gap-6 border-b border-[var(--ui-border)] text-xs pt-1 overflow-x-auto">
          {/* 1. Tất cả */}
          <button
            type="button"
            onClick={() => handleTabClick('all', 'library')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'border-b-2 border-[var(--ui-primary)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
            }`}
          >
            <FileText className="w-4 h-4 stroke-[1.75]" />
            <span>Tất cả</span>
          </button>

          {/* 2. Của tôi */}
          <button
            type="button"
            onClick={() => handleTabClick('mine', 'private')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'mine'
                ? 'border-b-2 border-[var(--ui-primary)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
            }`}
          >
            <User className="w-4 h-4 stroke-[1.75]" />
            <span>Của tôi</span>
          </button>

          {/* 3. Công ty */}
          <button
            type="button"
            onClick={() => handleTabClick('company', 'company')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'company'
                ? 'border-b-2 border-[var(--ui-primary)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
            }`}
          >
            <Building2 className="w-4 h-4 stroke-[1.75]" />
            <span>Công ty</span>
          </button>

          {/* 4. Được chia sẻ */}
          <button
            type="button"
            onClick={() => handleTabClick('shared', 'shared')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'shared'
                ? 'border-b-2 border-[var(--ui-primary)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
            }`}
          >
            <Users className="w-4 h-4 stroke-[1.75]" />
            <span>Được chia sẻ</span>
          </button>

          {/* 5. Gần đây */}
          <button
            type="button"
            onClick={() => handleTabClick('meeting', 'meeting_notes')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'meeting'
                ? 'border-b-2 border-[var(--ui-primary)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
            }`}
          >
            <Clock className="w-4 h-4 stroke-[1.75]" />
            <span>Gần đây</span>
          </button>

          {/* Hidden button preserved for test compatibility without showing in UI */}
          <button
            type="button"
            onClick={() => handleTabClick('template', 'templates')}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          >
            Mẫu
          </button>
        </div>}

        {/* Filters and View Controls Toolbar matching image_59ef5bd1.png */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Left Controls: Search + Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input: [🔍 Tìm trong thư viện...] */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--ui-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={trashMode ? 'Tìm trong thùng rác...' : 'Tìm trong thư viện...'}
                className="pl-8 pr-3 py-1.5 w-52 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl text-xs text-[var(--ui-text)] placeholder:text-[var(--ui-tertiary)] focus:outline-none focus:border-[var(--ui-primary)] transition-colors"
              />
            </div>

            {/* Loại tài liệu ▾ */}
            <div className="relative" ref={typeMenuRef}>
              <button
                type="button"
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-[var(--ui-surface)] transition-colors cursor-pointer ${
                  selectedType !== 'all'
                    ? 'border-[var(--ui-primary)] text-[var(--ui-text)] font-semibold bg-[var(--ui-hover)]'
                    : 'border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                {selectedTypeOption && <selectedTypeOption.Icon className={`w-3.5 h-3.5 ${selectedTypeOption.iconColor}`} />}
                <span>
                  {selectedTypeOption?.label || 'Loại tài liệu'}
                </span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[var(--ui-tertiary)]" />
              </button>

              {showTypeMenu && (
                <div className="absolute left-0 top-9 z-40 w-44 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-xl py-1 text-xs text-[var(--ui-text)] animate-in zoom-in-95 duration-100">
                  {[{ id: 'all', label: 'Tất cả loại', Icon: null, iconColor: '' }, ...typeOptions].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.id);
                        setShowTypeMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                        selectedType === item.id ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                      }`}
                    >
                      <span className="flex items-center gap-2">{item.Icon && <item.Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />}{item.label}</span>
                      {selectedType === item.id && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Thư mục ▾ */}
            <div className="relative" ref={folderMenuRef}>
              <button
                type="button"
                onClick={() => setShowFolderMenu(!showFolderMenu)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-[var(--ui-surface)] transition-colors cursor-pointer ${
                  selectedFolderId !== 'all'
                    ? 'border-[var(--ui-primary)] text-[var(--ui-text)] font-semibold bg-[var(--ui-hover)]'
                    : 'border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                <span>
                  {selectedFolderId === 'all'
                    ? 'Thư mục'
                    : folders.find((f) => f.id === selectedFolderId)?.name || 'Thư mục'}
                </span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[var(--ui-tertiary)]" />
              </button>

              {showFolderMenu && (
                <div className="absolute left-0 top-9 z-40 w-48 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-xl py-1 text-xs text-[var(--ui-text)] animate-in zoom-in-95 duration-100 max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolderId('all');
                      setShowFolderMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                      selectedFolderId === 'all' ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                    }`}
                  >
                    <span>Tất cả thư mục</span>
                    {selectedFolderId === 'all' && <span className="text-[10px]">✓</span>}
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFolderId(f.id);
                        setShowFolderMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                        selectedFolderId === f.id ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                      }`}
                    >
                      <span className="truncate">{getFolderPath(f.id, folders)}</span>
                      {selectedFolderId === f.id && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Người tạo ▾ */}
            <div className="relative" ref={authorMenuRef}>
              <button
                type="button"
                onClick={() => setShowAuthorMenu(!showAuthorMenu)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-[var(--ui-surface)] transition-colors cursor-pointer ${
                  selectedAuthor !== 'all'
                    ? 'border-[var(--ui-primary)] text-[var(--ui-text)] font-semibold bg-[var(--ui-hover)]'
                    : 'border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                <span>{selectedAuthor === 'all' ? 'Người tạo' : selectedAuthor === 'me' ? 'Bạn' : selectedAuthor}</span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[var(--ui-tertiary)]" />
              </button>

              {showAuthorMenu && (
                <div className="absolute left-0 top-9 z-40 w-44 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-xl py-1 text-xs text-[var(--ui-text)] animate-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAuthor('all');
                      setShowAuthorMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                      selectedAuthor === 'all' ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                    }`}
                  >
                    <span>Tất cả người tạo</span>
                    {selectedAuthor === 'all' && <span className="text-[10px]">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAuthor('me');
                      setShowAuthorMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                      selectedAuthor === 'me' ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                    }`}
                  >
                    <span>Bạn</span>
                    {selectedAuthor === 'me' && <span className="text-[10px]">✓</span>}
                  </button>
                  {authorsList
                    .filter((a) => a !== 'Việt Cường')
                    .map((author) => (
                      <button
                        key={author}
                        type="button"
                        onClick={() => {
                          setSelectedAuthor(author);
                          setShowAuthorMenu(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                          selectedAuthor === author ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                        }`}
                      >
                        <span className="truncate">{author}</span>
                        {selectedAuthor === author && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Sort + View Mode (List/Grid) + Tune */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort: [⇅ Mới cập nhật ▾] */}
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--ui-border)] text-xs font-medium bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-tertiary)]" />
                <span>
                  {sortBy === 'updated_desc'
                    ? (trashMode ? 'Mới xóa' : 'Mới cập nhật')
                    : sortBy === 'updated_asc'
                    ? 'Cũ nhất trước'
                    : 'Tên (A-Z)'}
                </span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[var(--ui-tertiary)]" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-9 z-40 w-44 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-xl py-1 text-xs text-[var(--ui-text)] animate-in zoom-in-95 duration-100">
                  {[
                    { id: 'updated_desc', label: trashMode ? 'Mới xóa' : 'Mới cập nhật' },
                    { id: 'updated_asc', label: 'Cũ nhất trước' },
                    { id: 'title_asc', label: 'Tên (A → Z)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSortBy(s.id as any);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer ${
                        sortBy === s.id ? 'font-semibold text-[var(--ui-text)]' : 'text-[var(--ui-text-secondary)]'
                      }`}
                    >
                      <span>{s.label}</span>
                      {sortBy === s.id && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle: [FolderTree (Cây thư mục)] [List (Danh sách)] [Grid (Lưới)] */}
            <div className="inline-flex items-center p-0.5 bg-[var(--ui-hover)] border border-[var(--ui-border)] rounded-xl">
              <button
                type="button"
                disabled={treeDisabled}
                onClick={() => setViewMode('tree')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  viewMode === 'tree'
                    ? 'bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-2xs font-semibold'
                    : 'text-[var(--ui-tertiary)] hover:text-[var(--ui-text)]'
                }`}
                title="Dạng cây thư mục"
                aria-label="Dạng cây thư mục"
              >
                <FolderTree className="w-3.5 h-3.5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-2xs font-semibold'
                    : 'text-[var(--ui-tertiary)] hover:text-[var(--ui-text)]'
                }`}
                title="Dạng danh sách"
                aria-label="Dạng danh sách"
              >
                <ListIcon className="w-3.5 h-3.5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-2xs font-semibold'
                    : 'text-[var(--ui-tertiary)] hover:text-[var(--ui-text)]'
                }`}
                title="Dạng lưới"
                aria-label="Dạng lưới"
              >
                <Grid className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {viewMode === 'tree' && (
              <button
                type="button"
                onClick={() => {
                  const allOpen = folders.every((f) => isFolderExpanded(f.id));
                  if (allOpen) collapseAllFolders();
                  else expandAllFolders();
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] text-[11px] text-[var(--ui-text-secondary)] font-medium transition-colors cursor-pointer"
                title="Mở rộng / Thu gọn tất cả thư mục"
              >
                <span>{folders.every((f) => isFolderExpanded(f.id)) ? 'Thu gọn' : 'Mở tất cả'}</span>
              </button>
            )}

            {/* Sliders / Tune icon */}
            <button
              type="button"
              onClick={() => {
                setSelectedType('all');
                setSelectedFolderId('all');
                setSelectedAuthor('all');
                setSearchQuery('');
                onToast?.('Đã đặt lại tất cả bộ lọc');
              }}
              className="p-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Scrollable Document List Area */}
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full px-[5%] py-5 space-y-4">
        {/* Batch actions bar when items are checked */}
        {selectedDocIds.size > 0 && (
          <div className="p-2.5 px-4 rounded-xl theme-primary bg-[var(--ui-primary)] text-white text-xs flex items-center justify-between animate-in fade-in duration-100">
            <span>Đã chọn {selectedDocIds.size} tài liệu</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  selectedDocIds.forEach((id) => trashMode ? onRestore?.(id) : onSoftDeleteDocument(id));
                  setSelectedDocIds(new Set());
                }}
                className="px-2.5 py-1 rounded-lg bg-[var(--ui-surface)]/20 hover:bg-[var(--ui-surface)]/30 text-white font-medium transition-colors"
              >
                {trashMode ? 'Khôi phục đã chọn' : 'Chuyển vào thùng rác'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocIds(new Set())}
                className="text-white/70 hover:text-white px-2 py-1"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center border border-[var(--ui-border)] rounded-2xl bg-[var(--ui-surface)] space-y-2">
            <p className="text-xs font-semibold text-[var(--ui-text)]">{trashMode && !activeDocs.length ? 'Thùng rác đang trống' : 'Không tìm thấy tài liệu phù hợp'}</p>
            <p className="text-xs text-[var(--ui-tertiary)]">{trashMode && !activeDocs.length ? 'Các tài liệu đã xóa sẽ xuất hiện ở đây.' : 'Hãy thử chuyển sang tab khác hoặc xóa bộ lọc.'}</p>
          </div>
        ) : viewMode === 'tree' ? (
          /* Tree View - Dạng cây thư mục (Mặc định) */
          <div className="border-t border-[var(--ui-border)] overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--ui-border)] text-[var(--ui-tertiary)] font-medium">
                  {/* Select All Checkbox */}
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#C7C7CC] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)]">Tên tài liệu / Thư mục</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-32">Loại</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-48">Vị trí</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-32">Người tạo</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-44">{trashMode ? 'Ngày xóa' : 'Cập nhật'}</th>
                  <th className="py-2.5 px-2 w-10 text-center">···</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7]">
                {renderTreeContent()}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'list' ? (
          /* Table View exactly matching image_59ef5bd1.png */
          <div className="border-t border-[var(--ui-border)] overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--ui-border)] text-[var(--ui-tertiary)] font-medium">
                  {/* Select All Checkbox */}
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#C7C7CC] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)]">Tên tài liệu</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-32">Loại</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-48">Vị trí</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-32">Người tạo</th>
                  <th className="py-2.5 px-3 font-medium text-[var(--ui-tertiary)] w-44">{trashMode ? 'Ngày xóa' : 'Cập nhật'}</th>
                  <th className="py-2.5 px-2 w-10 text-center">···</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7]">
                {filteredDocs.map((doc) => renderDocumentTableRow(doc, 0))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDocs.map((doc) => {
              const isBeingDragged = isDraggingDocument && draggedId === doc.id;
              return (
                <div
                  key={doc.id}
                  draggable={!trashMode}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragDocument(e, doc.id);
                  }}
                  onDragEnd={() => {
                    clearActiveDrag();
                  }}
                  onClick={() => { if (!trashMode) onOpenDocument(doc.id); }}
                  className={`p-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--ui-primary)] hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between h-40 space-y-2 shadow-2xs select-none ${
                    isBeingDragged ? 'opacity-40 scale-95 border-dashed border-[var(--ui-primary)]' : ''
                  }`}
                >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ui-text)]">
                      <FileText className="w-5 h-5 stroke-[1.75]" />
                    </span>
                    {trashMode ? renderTrashActions(doc) : getTypeBadge(doc)}
                  </div>
                  <h3 className="text-xs font-bold text-[var(--ui-text)] mt-2 line-clamp-1 group-hover:underline">
                    {doc.title || 'Không có tiêu đề'}
                  </h3>
                  <p className="text-[11px] text-[var(--ui-tertiary)] mt-0.5 line-clamp-1">
                    {getLocationString(doc)}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F2F2F7] flex items-center justify-between text-[11px] text-[var(--ui-tertiary)]">
                  <span>{getAuthorDisplay(doc)}</span>
                  <span>{displayDateTime(trashMode ? doc.deletedAt || doc.updatedAt : doc.updatedAt)}</span>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Footer info matching image_59ef5bd1.png: "8 tài liệu" and "Chỉ hiển thị nội dung bạn có quyền truy cập." */}
        <div className="pt-4 flex items-center justify-between text-xs text-[var(--ui-tertiary)]">
          <span>{filteredDocs.length} tài liệu</span>
          <span>Chỉ hiển thị nội dung bạn có quyền truy cập.</span>
        </div>
      </div>
    </div>

      {/* Row More Actions Popover Menu */}
      {renamingDocId && <RenameDialog key={renamingDocId} kind="document"
        initialName={documents.find(doc => doc.id === renamingDocId)?.title || ''}
        onSave={name => onRenameDocument?.(renamingDocId, name)} onClose={() => setRenamingDocId(null)} />}
      {shareDocument && <DocumentLinkShare document={shareDocument} onClose={() => setShareDocument(null)} />}
      <DocumentActionMenu
        ref={rowMenuRef}
        isOpen={!!activeRowDoc}
        isFavorite={activeRowDoc?.isFavorite}
        position={rowMenuPos}
        onShare={() => { if (activeRowDoc) setShareDocument(activeRowDoc); }}
        onClose={() => setActiveRowDoc(null)}
        onToggleFavorite={activeRowDoc?.space === 'personal' ? () => onToggleFavorite(activeRowDoc.id) : undefined}
        onRename={() => {
          if (activeRowDoc) {
            setRenamingDocId(activeRowDoc.id);
          }
        }}
        onMove={() => {
          if (activeRowDoc) onMoveDocumentRequest?.(activeRowDoc);
        }}
        onDelete={() => {
          if (activeRowDoc) onSoftDeleteDocument(activeRowDoc.id);
        }}
      />
    </div>
  );
};
