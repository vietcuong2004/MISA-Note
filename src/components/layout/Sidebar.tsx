import React, { useState, useRef, useEffect } from 'react';
import {
  SquarePen,
  Sparkles,
  MoreHorizontal,
  Search,
  Clock,
  Star,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderPlus,
  Plus,
  Trash2,
  Users,
  FileText,
  Upload,
  MessageSquare,
  ChevronsLeft,
  PanelLeftOpen,
  Edit2,
  BookOpen,
  Copy,
  Link2,
  Repeat,
  ExternalLink,
  PanelRight,
  ArrowRight,
  X,
  LayoutGrid,
} from 'lucide-react';
import { Document, Folder as FolderType, SpaceType, UserRole, ViewState } from '../../types';
import { CURRENT_USER, TEMPLATES } from '../../data/mockData';
import { ConfirmMoveDialog } from '../modals/ConfirmMoveDialog';
import { MoveFolderModal } from '../modals/MoveFolderModal';
import { FolderTree } from './FolderTree';
import { getFolderAncestors, getFolderPath } from '../../utils/folders';
import {
  canDropFolderInto,
  clearActiveDrag,
  getDragPayload,
  setDragDocument,
  useActiveDrag,
} from '../../utils/dnd';
import { documentUrl } from '../../app/router/routes';

interface SidebarProps {
  documents: Document[];
  folders: FolderType[];
  viewState: ViewState;
  currentRole: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  sidebarWidth?: number;
  onWidthChange?: (width: number) => void;
  onNavigate: (view: ViewState) => void;
  onCreateDocument: (space: SpaceType, folderId?: string | null) => void;
  onCreateFolder: (space: SpaceType, parentId?: string | null) => void;
  newFolderId: string | null;
  onFinishNewFolder: () => void;
  onRenameNewFolder: (folder: FolderType, name: string) => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  onRoleChange: (role: UserRole) => void;
  onOpenSpotlight: () => void;
  onOpenOneAI: () => void;
  onCreateMeetingNote: () => void;
  onOpenTemplates: () => void;
  onOpenChat: () => void;
  onCreateTaskList?: () => void;
  onImportDoc: () => void;
  onToggleFavorite?: (docId: string) => void;
  onSoftDeleteDocument?: (docId: string) => void;
  onDuplicateDocument?: (docId: string) => void;
  onRenameDocument?: (docId: string, newTitle: string) => void;
  onMoveDocumentRequest?: (doc: Document) => void;
  onMoveDocument?: (docId: string, targetFolderId: string | null, targetSpace: SpaceType) => void;
  onMoveFolder?: (folderId: string, targetParentId: string | null, targetSpace: SpaceType) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  folders,
  viewState,
  currentRole,
  collapsed,
  onToggleCollapse,
  sidebarWidth = 280,
  onWidthChange,
  onNavigate,
  onCreateDocument,
  onCreateFolder,
  newFolderId,
  onFinishNewFolder,
  onRenameNewFolder,
  onEditFolder,
  onDeleteFolder,
  onRoleChange,
  onOpenSpotlight,
  onOpenOneAI,
  onCreateMeetingNote,
  onOpenTemplates,
  onImportDoc,
  onToggleFavorite,
  onSoftDeleteDocument,
  onDuplicateDocument,
  onRenameDocument,
  onMoveDocumentRequest,
  onMoveDocument,
  onMoveFolder,
  onToast,
}) => {
  const DEFAULT_SIDEBAR_WIDTH = 280;
  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 520;

  const [width, setWidth] = useState(sidebarWidth || DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const widthRef = useRef(width);

  useEffect(() => {
    if (sidebarWidth && !isResizingRef.current) {
      setWidth(sidebarWidth);
      widthRef.current = sidebarWidth;
    }
  }, [sidebarWidth]);

  const isNarrowFooter = width < 260;
  const isNarrowHeader = width < 240;

  const handleStartResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, moveEvent.clientX));
      setWidth(newWidth);
      widthRef.current = newWidth;
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      try {
        localStorage.setItem('misa_sidebar_width', String(widthRef.current));
      } catch (err) {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetWidth = () => {
    setWidth(DEFAULT_SIDEBAR_WIDTH);
    widthRef.current = DEFAULT_SIDEBAR_WIDTH;
    onWidthChange?.(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem('misa_sidebar_width', String(DEFAULT_SIDEBAR_WIDTH));
    } catch (err) {}
    onToast?.(`Đã đặt lại độ rộng thanh bên về mặc định (${DEFAULT_SIDEBAR_WIDTH}px)`, 'info');
  };

  const [personalExpanded, setPersonalExpanded] = useState(true);
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  const [spaceTab, setSpaceTab] = useState<SpaceType>('personal');
  useEffect(() => {
    const folder = folders.find(folder => folder.id === newFolderId);
    if (!folder) return;
    setSpaceTab(folder.space);
    if (folder.space === 'personal') setPersonalExpanded(true); else setCompanyExpanded(true);
  }, [newFolderId, folders]);
  const locationKey = viewState.type === 'document' ? viewState.documentId : viewState.type === 'folder' ? viewState.folderId : null;
  const navigatedSpace = viewState.type === 'document'
    ? documents.find(doc => doc.id === viewState.documentId)?.space
    : viewState.type === 'folder' ? folders.find(folder => folder.id === viewState.folderId)?.space
    : viewState.type === 'private' ? 'personal' : viewState.type === 'company' ? 'company' : undefined;
  useEffect(() => {
    if (navigatedSpace) setSpaceTab(navigatedSpace);
  }, [locationKey, navigatedSpace]);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [favoriteExpanded, setFavoriteExpanded] = useState(true);
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showAITooltip, setShowAITooltip] = useState(false);
  const [showCreateTooltip, setShowCreateTooltip] = useState(false);

  // Drag and Drop state
  const {
    isDragging: isGlobalDragging,
    isDraggingFolder: isGlobalFolder,
    isDraggingDocument: isGlobalDoc,
    draggedId: globalDraggedId,
  } = useActiveDrag();
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRootSpace, setDragOverRootSpace] = useState<SpaceType | null>(null);
  const isDraggingAny = isGlobalDragging || !!draggingDocId || !!draggingFolderId;

  // Folder Move Modal state
  const [moveFolderModal, setMoveFolderModal] = useState<{
    isOpen: boolean;
    folder: FolderType | null;
  }>({
    isOpen: false,
    folder: null,
  });

  // Confirmation Move Dialog state
  const [confirmMoveState, setConfirmMoveState] = useState<{
    isOpen: boolean;
    doc: Document | null;
    targetFolder: FolderType | null;
    targetSpace: SpaceType;
    currentLocationName: string;
    targetLocationName: string;
  }>({
    isOpen: false,
    doc: null,
    targetFolder: null,
    targetSpace: 'personal',
    currentLocationName: '',
    targetLocationName: '',
  });

  // Document context menu & hover tooltip state (matching user's screenshots)
  const [hoveredMoreDocId, setHoveredMoreDocId] = useState<string | null>(null);
  const [docMenuState, setDocMenuState] = useState<{
    isOpen: boolean;
    doc: Document | null;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    doc: null,
    position: { top: 0, left: 0 },
  });

  // Inline rename state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState<string>('');

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    fld_work: true,
    fld_personal: false,
    fld_process: false,
    fld_product_docs: false,
  });

  const knownFolderIds = useRef(new Set(folders.map(folder => folder.id)));
  const activeFolderId = viewState.type === 'folder' ? viewState.folderId :
    viewState.type === 'document' ? documents.find(doc => doc.id === viewState.documentId)?.folderId : null;
  useEffect(() => {
    const toExpand = new Set<string>();
    for (const folder of folders) {
      if (!knownFolderIds.current.has(folder.id) && folder.parentId) {
        getFolderAncestors(folder.parentId, folders).forEach(ancestor => toExpand.add(ancestor.id));
      }
    }
    if (activeFolderId) getFolderAncestors(activeFolderId, folders).forEach(ancestor => toExpand.add(ancestor.id));
    knownFolderIds.current = new Set(folders.map(folder => folder.id));
    if (toExpand.size) setExpandedFolders(previous => ({ ...previous, ...Object.fromEntries([...toExpand].map(id => [id, true])) }));
  }, [folders, activeFolderId]);

  const menuRef = useRef<HTMLDivElement>(null);
  const quickActionTriggerRef = useRef<HTMLButtonElement>(null);
  const closeQuickActions = () => {
    setShowQuickActionMenu(false);
    quickActionTriggerRef.current?.focus();
  };
  useEffect(() => {
    if (!showQuickActionMenu) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeQuickActions(); }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showQuickActionMenu]);
  const docMenuRef = useRef<HTMLDivElement>(null);

  const getLocationName = (doc: Document) => {
    const fld = folders.find((f) => f.id === doc.folderId);
    if (fld) {
      const spaceLabel = fld.space === 'personal' ? 'Của tôi' : 'Công ty';
      return `${spaceLabel} / ${getFolderPath(fld.id, folders)}`;
    }
    return doc.space === 'personal' ? 'Của tôi' : 'Công ty';
  };

  const handleDirectMoveDocument = (
    docId: string,
    targetFolder: FolderType | null,
    targetSpace?: SpaceType
  ) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const resolvedSpace = targetFolder ? targetFolder.space : targetSpace || doc.space;

    if (doc.folderId === (targetFolder?.id || null) && doc.space === resolvedSpace) {
      onToast?.('Tài liệu đã ở vị trí này rồi', 'info');
      return;
    }

    onMoveDocument?.(doc.id, targetFolder?.id || null, resolvedSpace);
    if (targetFolder) {
      setExpandedFolders((prev) => ({ ...prev, [targetFolder.id]: true }));
    }
    const spaceTitle = resolvedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
    const folderName = targetFolder ? `thư mục "${targetFolder.name}"` : `thư mục gốc ("${spaceTitle}")`;
    onToast?.(`Đã di chuyển "${doc.title}" vào ${folderName}`);
  };

  const handleDirectMoveFolder = (
    folderId: string,
    targetParentId: string | null,
    targetSpace: SpaceType
  ) => {
    const fld = folders.find((f) => f.id === folderId);
    if (!fld) return;

    if (!canDropFolderInto(folderId, targetParentId, folders)) {
      onToast?.('Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó', 'error');
      return;
    }

    if (fld.parentId === targetParentId && fld.space === targetSpace) {
      onToast?.('Thư mục đã ở vị trí này rồi', 'info');
      return;
    }

    try {
      onMoveFolder?.(folderId, targetParentId, targetSpace);
      if (targetParentId) {
        setExpandedFolders((prev) => ({ ...prev, [targetParentId]: true }));
      }
      const targetParent = folders.find((f) => f.id === targetParentId);
      const spaceLabel = targetSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
      const locText = targetParent
        ? `thư mục "${targetParent.name}"`
        : `thư mục gốc ("${spaceLabel}")`;
      onToast?.(`Đã di chuyển thư mục "${fld.name}" vào ${locText}`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : 'Không thể di chuyển thư mục', 'error');
    }
  };

  const handleDropOnRoot = (e: React.DragEvent, space: SpaceType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRootSpace(null);
    const payload = getDragPayload(e, folders, documents);
    clearActiveDrag();
    let fldId = payload?.type === 'folder' ? payload.id : null;
    let docId = payload?.type === 'document' ? payload.id : null;

    if (!fldId && draggingFolderId) fldId = draggingFolderId;
    if (!docId && draggingDocId) docId = draggingDocId;
    if (!fldId && !docId && globalDraggedId) {
      if (isGlobalFolder) fldId = globalDraggedId;
      else if (isGlobalDoc) docId = globalDraggedId;
    }

    setDraggingDocId(null);
    setDraggingFolderId(null);

    if (fldId) {
      handleDirectMoveFolder(fldId, null, space);
    } else if (docId) {
      handleDirectMoveDocument(docId, null, space);
    }
  };

  const handlePromptMove = (
    docId: string,
    targetFolder: FolderType | null,
    targetSpace?: SpaceType
  ) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const resolvedSpace = targetFolder ? targetFolder.space : targetSpace || doc.space;

    if (doc.folderId === (targetFolder?.id || null) && doc.space === resolvedSpace) {
      onToast?.('Tài liệu đã ở trong thư mục này', 'info');
      return;
    }

    const currentLoc = getLocationName(doc);
    const spaceTitle = resolvedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
    const targetLoc = targetFolder
      ? `${targetFolder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'} / ${getFolderPath(targetFolder.id, folders)}`
      : `${spaceTitle} (Thư mục gốc)`;

    setConfirmMoveState({
      isOpen: true,
      doc,
      targetFolder,
      targetSpace: resolvedSpace,
      currentLocationName: currentLoc,
      targetLocationName: targetLoc,
    });
  };

  const handleConfirmMove = () => {
    if (!confirmMoveState.doc) return;
    const { doc, targetFolder, targetSpace } = confirmMoveState;
    const targetFolderId = targetFolder ? targetFolder.id : null;

    onMoveDocument?.(doc.id, targetFolderId, targetSpace);

    if (targetFolderId) {
      setExpandedFolders((prev) => ({ ...prev, [targetFolderId]: true }));
    }

    const spaceTitle = targetSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
    const folderName = targetFolder ? `thư mục "${targetFolder.name}"` : `thư mục gốc ("${spaceTitle}")`;
    onToast?.(`Đã di chuyển "${doc.title}" vào ${folderName}`);
    setConfirmMoveState({
      isOpen: false,
      doc: null,
      targetFolder: null,
      targetSpace: 'personal',
      currentLocationName: '',
      targetLocationName: '',
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowQuickActionMenu(false);
      }
      if (docMenuRef.current && !docMenuRef.current.contains(e.target as Node)) {
        setDocMenuState({ isOpen: false, doc: null, position: { top: 0, left: 0 } });
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDocs = documents.filter((d) => !d.isTrash);
  const trashDocs = documents.filter((d) => d.isTrash);

  const recentDocs = activeDocs
    .filter((doc) => doc.space === 'personal' && !doc.folderId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const favoriteDocs = activeDocs.filter((d) => d.isFavorite);


  const personalRootDocs = activeDocs
    .filter((d) => d.space === 'personal' && !d.folderId && d.id !== 'doc_meeting_notes')
    .sort((a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime());
  const companyRootDocs = activeDocs
    .filter((d) => d.space === 'company' && !d.folderId)
    .sort((a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime());

  const isDocActive = (docId: string) =>
    viewState.type === 'document' && viewState.documentId === docId;

  // Handle open document menu with exact popup position
  const handleOpenDocMenu = (doc: Document, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 260;
    const menuHeight = 390;

    let left = rect.right + 6;
    if (left + menuWidth > window.innerWidth) {
      left = rect.left - menuWidth - 6;
    }

    let top = rect.top;
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - 16;
    }

    setDocMenuState({
      isOpen: true,
      doc,
      position: { top: Math.max(12, top), left },
    });
    setHoveredMoreDocId(null);
  };

  const closeDocMenu = () => {
    setDocMenuState({ isOpen: false, doc: null, position: { top: 0, left: 0 } });
  };

  const handleSaveRename = (docId: string) => {
    if (renameTitle.trim()) {
      onRenameDocument?.(docId, renameTitle.trim());
    }
    setRenamingDocId(null);
  };

  // Helper to render individual document row with 2 hover action icons (+ and ···) and drag-and-drop
  const renderDocumentItem = (doc: Document, defaultFolderId?: string | null) => {
    const isActive = isDocActive(doc.id);
    const isRenaming = renamingDocId === doc.id;
    const isDragging = draggingDocId === doc.id || (isGlobalDragging && globalDraggedId === doc.id);

    return (
      <div
        key={doc.id}
        draggable={!isRenaming}
        onDragStart={(e) => {
          e.stopPropagation();
          setDragDocument(e, doc.id);
          setDraggingDocId(doc.id);
        }}
        onDragEnd={() => {
          clearActiveDrag();
          setDraggingDocId(null);
          setDragOverFolderId(null);
          setDragOverRootSpace(null);
        }}
        onClick={() => {
          if (!isRenaming) {
            onNavigate({ type: 'document', documentId: doc.id });
          }
        }}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all select-none ${
          isRenaming ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'
        } ${
          isActive
            ? 'bg-[var(--ui-active-note)] text-[var(--ui-active-note-text)] font-semibold shadow-2xs'
            : 'hover:bg-[var(--ui-selected)] text-[var(--ui-text-secondary)]'
        } ${isDragging ? 'opacity-30 scale-95 border border-dashed border-[var(--ui-primary)] bg-[var(--ui-hover)]' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {doc.icon === '💬' || doc.tags?.includes('Đoạn chat') ? (
            <MessageSquare className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isActive ? 'text-[var(--ui-active-note-text)]' : 'text-[var(--ui-text)]'}`} />
          ) : doc.type === 'meeting' ? (
            <Users className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isActive ? 'text-[var(--ui-active-note-text)]' : 'text-[var(--ui-text)]'}`} />
          ) : (
            <FileText className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isActive ? 'text-[var(--ui-active-note-text)]' : 'text-[var(--ui-text)]'}`} />
          )}
          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(doc.id);
                if (e.key === 'Escape') setRenamingDocId(null);
              }}
              onBlur={() => handleSaveRename(doc.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs bg-[var(--ui-surface)] border border-[var(--ui-primary)] rounded px-1.5 py-0.5 focus:outline-none"
            />
          ) : (
            <span className="truncate text-xs">{doc.title || 'Không có tiêu đề'}</span>
          )}
          {doc.isFavorite && (
            <Star className="w-2.5 h-2.5 fill-[#1D1D1F] text-[var(--ui-text)] shrink-0" />
          )}
        </div>

        {/* 2 hover action icons matching user screenshot: [+] and [···] */}
        {!isRenaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 ml-1">
            {/* 1. Plus button: Thêm tài liệu mới */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateDocument(doc.space, defaultFolderId ?? doc.folderId);
              }}
              className="p-1 rounded-md hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
              title="Thêm tài liệu"
            >
              <Plus className="w-3 h-3 stroke-[2]" />
            </button>

            {/* 2. MoreHorizontal button with dark tooltip: "Xóa, sao chép và nhiều thao tác khác..." */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => handleOpenDocMenu(doc, e)}
                onMouseEnter={() => setHoveredMoreDocId(doc.id)}
                onMouseLeave={() => setHoveredMoreDocId(null)}
                className="p-1 rounded-md hover:bg-[var(--ui-hover-strong)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                title=""
              >
                <MoreHorizontal className="w-3 h-3 stroke-[1.75]" />
              </button>

              {/* Dark Tooltip Bubble matching screenshot image_1bfc8ff5.png */}
              {hoveredMoreDocId === doc.id &&
                (!docMenuState.isOpen || docMenuState.doc?.id !== doc.id) && (
                  <div className="absolute right-0 bottom-full mb-2 z-50 whitespace-nowrap bg-[#262626] text-white text-[11px] font-normal px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none animate-in fade-in duration-100">
                    Xóa, sao chép và nhiều thao tác khác...
                    <div className="absolute top-full right-2 border-4 border-transparent border-t-[#262626]" />
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFolderTree = (space: SpaceType) => (
    <FolderTree
      folders={folders}
      documents={activeDocs}
      newFolderId={newFolderId}
      onFinishNewFolder={onFinishNewFolder}
      onRenameNewFolder={onRenameNewFolder}
      space={space}
      view={viewState}
      expanded={expandedFolders}
      dragOverFolderId={dragOverFolderId}
      onToggle={(id) => setExpandedFolders((previous) => ({ ...previous, [id]: !previous[id] }))}
      onNavigate={onNavigate}
      onCreateFolder={onCreateFolder}
      onEditFolder={onEditFolder}
      onMoveFolder={(f) => setMoveFolderModal({ isOpen: true, folder: f })}
      onDeleteFolder={onDeleteFolder}
      onDragOverFolder={setDragOverFolderId}
      draggingDocumentId={draggingDocId}
      draggingFolderId={draggingFolderId}
      onDragStartFolder={setDraggingFolderId}
      onDragEndFolder={() => {
        setDraggingFolderId(null);
        setDragOverFolderId(null);
        setDragOverRootSpace(null);
      }}
      renderDocument={renderDocumentItem}
      onDropDocument={(folder, documentId) => {
        setDragOverFolderId(null);
        setDraggingDocId(null);
        setDragOverRootSpace(null);
        handleDirectMoveDocument(documentId, folder);
      }}
      onDropFolder={(targetFolder, draggedFolderId) => {
        setDragOverFolderId(null);
        setDraggingFolderId(null);
        setDragOverRootSpace(null);
        handleDirectMoveFolder(draggedFolderId, targetFolder.id, targetFolder.space);
      }}
    />
  );

  if (collapsed) {
    return (
      <aside className="app-sidebar w-[64px] h-full bg-[var(--ui-sidebar)] border-r border-[var(--ui-border)] flex flex-col items-center py-4 justify-between transition-all shrink-0 select-none">
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Expand Button */}
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-text)] ios-interactive shadow-2xs"
            title="Mở rộng thanh bên"
          >
            <PanelLeftOpen className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
          </button>

          <div className="w-8 h-[1px] bg-[var(--ui-border)] my-1" />

          {/* Quick Note icon */}
          <button
            onClick={() => {
              setRecentExpanded(true);
              onCreateDocument('personal', null);
            }}
            className="w-10 h-10 rounded-xl theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center ios-interactive shadow-xs"
            title="Tạo mới"
          >
            <SquarePen className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Quick Ask AI icon */}
          <button
            onClick={onOpenOneAI}
            className="w-10 h-10 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-text)] ios-interactive shadow-2xs"
            title="Hỏi AI"
          >
            <Sparkles className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Search Spotlight */}
          <button
            onClick={onOpenSpotlight}
            className="w-10 h-10 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-muted)] hover:text-[var(--ui-text)] ios-interactive shadow-2xs"
            title="Tìm kiếm (Ctrl+K)"
          >
            <Search className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            onClick={() => onNavigate({ type: 'recent' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'recent'
                ? 'bg-[var(--ui-selected)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'
            }`}
            title="Chưa phân loại"
          >
            <Clock className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Yêu thích */}
          <button
            onClick={() => onNavigate({ type: 'favorite' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'favorite'
                ? 'bg-[var(--ui-selected)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'
            }`}
            title="Yêu thích"
          >
            <Star className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Mẫu */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'templates' })}
            title="Mẫu"
            aria-label="Mẫu"
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'templates'
                ? 'bg-[var(--ui-selected)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Thư viện */}
          <button
            onClick={() => onNavigate({ type: 'library' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'library'
                ? 'bg-[var(--ui-selected)] text-[var(--ui-text)] font-bold'
                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'
            }`}
            title="Thư viện"
          >
            <BookOpen className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-3 w-full px-2">

          {/* Thùng rác icon */}
          <button
            onClick={() => onNavigate({ type: 'trash' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive relative ${
              viewState.type === 'trash'
                ? 'theme-primary bg-[var(--ui-primary)] text-white shadow-xs'
                : 'text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-selected)]'
            }`}
            title="Thùng rác"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
            {trashDocs.length > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] text-[9px] font-bold text-white theme-primary bg-[var(--ui-primary)] rounded-full flex items-center justify-center border border-white">
                {trashDocs.length}
              </span>
            )}
          </button>
        </div>
      </aside>
    );
  }

  // Expanded Sidebar matching user design
  return (
    <aside
      style={{ width: `${width}px` }}
      className={`app-sidebar h-full bg-[var(--ui-sidebar)] border-r border-[var(--ui-border)] flex flex-col justify-between select-none text-xs text-[var(--ui-text)] shrink-0 relative ${
        isResizing ? 'transition-none select-none' : 'transition-[width] duration-150'
      }`}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Quick Actions Row: [«] [Tạo mới] [Hỏi AI] [•••] */}
        <div className="px-3 pt-3 pb-2 relative" ref={menuRef}>
          <div className="flex items-center gap-1.5">
            {/* Collapse button « on the left of Tạo mới */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`h-9 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-selected)] flex items-center justify-center text-[var(--ui-text)] ios-interactive transition-colors cursor-pointer ${
                isNarrowHeader ? 'flex-1 min-w-0' : 'w-9 shrink-0'
              }`}
              title="Thu gọn thanh bên"
            >
              <ChevronsLeft className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Tạo mới button */}
            <div className={`relative ${isNarrowHeader ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
              <button
                type="button"
                onClick={() => {
                  setRecentExpanded(true);
                  onCreateDocument('personal', null);
                }}
                onMouseEnter={() => setShowCreateTooltip(true)}
                onMouseLeave={() => setShowCreateTooltip(false)}
                className={`w-full flex items-center justify-center gap-1.5 rounded-xl theme-primary bg-[var(--ui-primary)] text-white hover:bg-[var(--ui-primary-hover)] font-semibold text-xs transition-colors shadow-xs ios-interactive cursor-pointer h-9 ${
                  isNarrowHeader ? 'px-0' : 'py-2 px-2.5'
                }`}
                title="Tạo mới"
              >
                <SquarePen className="w-4 h-4 stroke-[2] shrink-0" />
                <span className={isNarrowHeader ? "sr-only" : "whitespace-nowrap"}>Tạo mới</span>
              </button>

              {/* Tooltip on hover when narrow */}
              {isNarrowHeader && showCreateTooltip && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-[#262626] text-white text-[10px] font-medium px-2.5 py-1 rounded-md shadow-lg animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#262626]" />
                  <span className="relative z-10">Tạo mới</span>
                </div>
              )}
            </div>

            {/* Hỏi AI button with tooltip */}
            <div className={`relative ${isNarrowHeader ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
              <button
                type="button"
                onClick={onOpenOneAI}
                onMouseEnter={() => setShowAITooltip(true)}
                onMouseLeave={() => setShowAITooltip(false)}
                className={`w-full flex items-center justify-center gap-1.5 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] font-semibold text-xs transition-colors ios-interactive cursor-pointer h-9 ${
                  isNarrowHeader ? 'px-0' : 'py-2 px-2'
                }`}
                title="Hỏi AI"
              >
                <Sparkles className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75] shrink-0" />
                <span className={isNarrowHeader ? "sr-only" : "whitespace-nowrap"}>Hỏi AI</span>
              </button>

              {/* Tooltip positioned below the button so it is never obscured by the top header */}
              {showAITooltip && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-[#262626] text-white text-[10px] font-medium px-2.5 py-1.5 rounded-md shadow-xl animate-in fade-in zoom-in-95 duration-100 pointer-events-none flex flex-col items-center">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#262626]" />
                  {isNarrowHeader && <span className="font-semibold text-white">Hỏi AI</span>}
                  <span className={isNarrowHeader ? "text-[9px] text-white/80" : "relative z-10"}>
                    {isNarrowHeader ? "OneAI sắp ra mắt" : "Kết nối OneAI sắp ra mắt"}
                  </span>
                </div>
              )}
            </div>

            {/* More button (•••) */}
            <button
              type="button"
              onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
              ref={quickActionTriggerRef}
              aria-expanded={showQuickActionMenu}
              aria-controls="quick-action-dialog"
              aria-haspopup="dialog"
              className={`h-9 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] flex items-center justify-center ios-interactive cursor-pointer ${
                isNarrowHeader ? 'flex-1 min-w-0' : 'w-9 shrink-0'
              }`}
              title="Thao tác nhanh khác"
            >
              <MoreHorizontal className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
            </button>
          </div>

          {/* Floating Popover "Thao tác nhanh" matching screenshot */}
          {showQuickActionMenu && (
            <div id="quick-action-dialog" role="dialog" aria-label="Thao tác nhanh" className="absolute right-3 top-12 z-50 w-52 max-w-[calc(100%_-_24px)] max-h-[calc(100dvh-120px)] overflow-y-auto bg-[var(--ui-surface)] rounded-2xl ios-elevated-shadow border border-[var(--ui-border)] py-2 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
              <div className="px-3.5 py-1 flex items-center justify-between text-[11px] font-semibold text-[var(--ui-tertiary)]">
                <span>Thao tác nhanh</span>
                <button type="button" autoFocus aria-label="Đóng thao tác nhanh" title="Đóng thao tác nhanh"
                  onClick={closeQuickActions} className="p-1 rounded-md hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Ghi chú cuộc họp */}
              <button
                type="button"
                onClick={() => {
                  onCreateMeetingNote();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Ghi chú cuộc họp</span>
              </button>

              {/* 2. Tạo từ mẫu */}
              <button
                type="button"
                onClick={() => {
                  onOpenTemplates();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Tạo từ mẫu</span>
              </button>

              {/* 3. Nhập tài liệu */}
              <button
                type="button"
                onClick={() => {
                  onImportDoc();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Nhập tài liệu</span>
              </button>

              {/* 4. Thư mục mới */}
              <button
                type="button"
                onClick={() => {
                  onCreateFolder('personal');
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Thư mục mới</span>
              </button>

            </div>
          )}
        </div>

        {/* Smart Sections: Gần đây & Yêu thích */}
        <div className="px-2 pt-2 space-y-1">
          {/* Section: Gần đây */}
          <div className="space-y-0.5">
            <div
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-[var(--ui-text)] ios-interactive transition-colors ${
                viewState.type === 'recent'
                  ? 'bg-[var(--ui-selected)] text-[var(--ui-text)] font-semibold'
                  : 'hover:bg-[var(--ui-selected)]'
              }`}
              onClick={() => { setRecentExpanded(true); onNavigate({ type: 'recent' }); }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button type="button" aria-label="Thu gọn hoặc mở ghi chú chưa phân loại" aria-expanded={recentExpanded}
                  onClick={event => { event.stopPropagation(); setRecentExpanded(!recentExpanded); }} className="text-[var(--ui-tertiary)]">
                  {recentExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                  )}
                </button>
                <Clock className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)] shrink-0" />
                <span className="text-xs font-medium truncate">Chưa phân loại</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {recentDocs.length > 0 && (
                  <span className="text-[10px] text-[var(--ui-tertiary)] font-mono px-1.5 py-0.2 rounded bg-[var(--ui-border)]">
                    {recentDocs.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecentExpanded(true);
                    onCreateDocument('personal', null);
                  }}
                  className="p-1 rounded hover:bg-[var(--ui-hover-strong)] text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Tạo ghi chú mới"
                >
                  <Plus className="w-3 h-3 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* List of recent documents right below "Gần đây" tab */}
            {recentExpanded && (
              <div className="pl-6 space-y-0.5 border-l border-[var(--ui-border)] ml-3.5 my-0.5">
                {recentDocs.slice(0, 7).map((doc) => renderDocumentItem(doc, doc.folderId))}
                {recentDocs.length === 0 && (
                  <div className="text-[10px] text-[var(--ui-tertiary)] italic px-2 py-1">
                    Chưa có ghi chú nào
                  </div>
                )}
                {recentDocs.length > 7 && (
                  <button
                    type="button"
                    onClick={() => onNavigate({ type: 'recent' })}
                    className="w-full text-left px-2 py-1 text-[11px] text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:underline font-medium cursor-pointer"
                  >
                    Xem tất cả ({recentDocs.length}) →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section: Yêu thích */}
          <div className="space-y-0.5">
            <div
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-[var(--ui-text)] ios-interactive transition-colors ${
                viewState.type === 'favorite'
                  ? 'bg-[var(--ui-selected)] text-[var(--ui-text)] font-semibold'
                  : 'hover:bg-[var(--ui-selected)]'
              }`}
              onClick={() => { setFavoriteExpanded(true); onNavigate({ type: 'favorite' }); }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button type="button" aria-label="Thu gọn hoặc mở mục yêu thích" aria-expanded={favoriteExpanded}
                  onClick={event => { event.stopPropagation(); setFavoriteExpanded(!favoriteExpanded); }} className="text-[var(--ui-tertiary)]">
                  {favoriteExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                  )}
                </button>
                <Star className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)] fill-[#1D1D1F] shrink-0" />
                <span className="text-xs font-medium truncate">Yêu thích</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {favoriteDocs.length > 0 && (
                  <span className="text-[10px] text-[var(--ui-tertiary)] font-mono px-1.5 py-0.2 rounded bg-[var(--ui-border)]">
                    {favoriteDocs.length}
                  </span>
                )}
              </div>
            </div>

            {/* List of favorite documents right below "Yêu thích" tab */}
            {favoriteExpanded && (
              <div className="pl-6 space-y-0.5 border-l border-[var(--ui-border)] ml-3.5 my-0.5">
                {favoriteDocs.map((doc) => renderDocumentItem(doc, doc.folderId))}
                {favoriteDocs.length === 0 && (
                  <div className="text-[10px] text-[var(--ui-tertiary)] italic px-2 py-1">
                    Chưa có mục yêu thích
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="sticky top-0 z-10 bg-[var(--ui-sidebar)] px-3 pt-4 pb-2 shrink-0">
          <div role="tablist" aria-label="Khu vực ghi chú" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--ui-tab-track)]">
            {(['personal', 'company'] as const).map(space => <button key={space} type="button"
              role="tab" id={`space-tab-${space}`} aria-controls={`space-panel-${space}`}
              aria-selected={spaceTab === space} tabIndex={spaceTab === space ? 0 : -1}
              onClick={() => { setSpaceTab(space); onNavigate({ type: space === 'personal' ? 'private' : 'company' }); }}
              onDragEnter={() => setSpaceTab(space)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => handleDropOnRoot(e, space)}
              onKeyDown={event => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  const target = event.key === 'Home' ? 'personal' : event.key === 'End' ? 'company' : space === 'personal' ? 'company' : 'personal';
                  setSpaceTab(target);
                  onNavigate({ type: target === 'personal' ? 'private' : 'company' });
                  document.getElementById(`space-tab-${target}`)?.focus();
                }
              }}
              className={`space-tab py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                spaceTab === space
                  ? 'bg-[var(--ui-surface)] text-[var(--ui-text)] font-bold shadow-xs border border-[var(--ui-border)] ring-1 ring-black/5'
                  : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]/50'
              }`}
              title={space === 'personal' ? 'Ghi chép của tôi (Cá nhân)' : 'Tài liệu công ty'}
            >
              {space === 'personal' ? 'Của tôi' : 'Công ty'}
            </button>)}
          </div>
        </div>

        {/* Section 1: GHI CHÉP CỦA TÔI */}
        <div
          role="tabpanel" id="space-panel-personal" aria-labelledby="space-tab-personal" hidden={spaceTab !== 'personal'}
          data-space-panel="personal"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => handleDropOnRoot(e, 'personal')}
          className={`relative px-2 pt-4 transition-all`}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverRootSpace !== 'personal') setDragOverRootSpace('personal');
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                if (dragOverRootSpace === 'personal') setDragOverRootSpace(null);
              }
            }}
            onDrop={(e) => handleDropOnRoot(e, 'personal')}
            className={`flex items-center justify-between px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase group rounded-lg transition-colors ${
              dragOverRootSpace === 'personal' ? 'bg-[var(--ui-primary)]/15 text-[var(--ui-primary)] ring-1 ring-[var(--ui-primary)]' : ''
            }`}
          >
            <button
              onClick={() => { setPersonalExpanded(true); onNavigate({ type: 'private' }); }}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewState.type === 'private'
                  ? 'text-[var(--ui-text)] font-extrabold'
                  : 'text-[var(--ui-tertiary)] hover:text-[var(--ui-text)]'
              }`}
            >
              <span>GHI CHÉP CỦA TÔI</span>
            </button>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setPersonalExpanded(!personalExpanded)} aria-label="Thu gọn hoặc mở ghi chú của tôi" aria-expanded={personalExpanded} className="p-1 rounded-md hover:bg-[var(--ui-border)]">
                {personalExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => onCreateDocument('personal', null)}
                className="p-1 rounded-md hover:bg-[var(--ui-border)] text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] cursor-pointer"
                title="Tạo ghi chú mới"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Keep this overlay out of flow: moving the source row during dragstart cancels native dragging in Chrome. */}
          {isDraggingAny && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverRootSpace !== 'personal') setDragOverRootSpace('personal');
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverRootSpace === 'personal') setDragOverRootSpace(null);
                }
              }}
              onDrop={(e) => handleDropOnRoot(e, 'personal')}
              className={`absolute top-0 inset-x-2 z-20 p-2.5 rounded-xl border-2 border-dashed text-xs text-center transition-colors cursor-pointer ${
                dragOverRootSpace === 'personal'
                  ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/15 text-[var(--ui-primary)] font-bold scale-[1.02]'
                  : 'border-[var(--ui-border-strong)] bg-[var(--ui-subtle)] text-[var(--ui-muted)] hover:border-[var(--ui-primary)]'
              }`}
            >
              📂 Thả vào đây để đưa ra thư mục gốc (Ghi chép của tôi)
            </div>
          )}

          {personalExpanded && (
            <div className="space-y-0.5 mt-1">
              {/* Unfiled Personal Documents: Ghi chú chưa phân loại at top, above folders (e.g. above "Công việc") */}
              {personalRootDocs.map((doc) => renderDocumentItem(doc, null))}

              {renderFolderTree('personal')}
            </div>
          )}
        </div>

        {/* Section 2: TÀI LIỆU CÔNG TY */}
        <div
          role="tabpanel" id="space-panel-company" aria-labelledby="space-tab-company" hidden={spaceTab !== 'company'}
          data-space-panel="company"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => handleDropOnRoot(e, 'company')}
          className={`relative px-2 pt-4 transition-all`}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverRootSpace !== 'company') setDragOverRootSpace('company');
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                if (dragOverRootSpace === 'company') setDragOverRootSpace(null);
              }
            }}
            onDrop={(e) => handleDropOnRoot(e, 'company')}
            className={`flex items-center justify-between px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase group rounded-lg transition-colors ${
              dragOverRootSpace === 'company' ? 'bg-[var(--ui-primary)]/15 text-[var(--ui-primary)] ring-1 ring-[var(--ui-primary)]' : 'text-[var(--ui-tertiary)]'
            }`}
          >
            <button
              onClick={() => { setCompanyExpanded(true); onNavigate({ type: 'company' }); }}
              className="flex items-center gap-1.5 hover:text-[var(--ui-text)] transition-colors cursor-pointer"
            >
              <span>TÀI LIỆU CÔNG TY</span>
            </button>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setCompanyExpanded(!companyExpanded)} aria-label="Thu gọn hoặc mở tài liệu công ty" aria-expanded={companyExpanded} className="p-1 rounded-md hover:bg-[var(--ui-border)]">
                {companyExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setCompanyExpanded(true);
                  setSpaceTab('company');
                  onCreateDocument('company', null);
                }}
                className="p-1 rounded-md hover:bg-[var(--ui-border)] text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] cursor-pointer"
                title="Tạo tài liệu công ty mới"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Keep the root target out of flow so starting a drag does not move the source row. */}
          {isDraggingAny && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverRootSpace !== 'company') setDragOverRootSpace('company');
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverRootSpace === 'company') setDragOverRootSpace(null);
                }
              }}
              onDrop={(e) => handleDropOnRoot(e, 'company')}
              className={`absolute top-0 inset-x-2 z-20 p-2.5 rounded-xl border-2 border-dashed text-xs text-center transition-colors cursor-pointer ${
                dragOverRootSpace === 'company'
                  ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/15 text-[var(--ui-primary)] font-bold scale-[1.02]'
                  : 'border-[var(--ui-border-strong)] bg-[var(--ui-subtle)] text-[var(--ui-muted)] hover:border-[var(--ui-primary)]'
              }`}
            >
              📂 Thả vào đây để đưa ra thư mục gốc (Tài liệu công ty)
            </div>
          )}

          {companyExpanded && (
            <div className="space-y-0.5 mt-1">
              {/* Unfiled Company Documents at the top */}
              {companyRootDocs.map((doc) => renderDocumentItem(doc, null))}

              {renderFolderTree('company')}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Fixed Utilities: Mẫu, Thư viện & Thùng rác (3 cái trên 1 hàng: Mẫu -> Thư viện -> Thùng rác) */}
      <div className="p-2 border-t border-[var(--ui-border)] bg-[var(--ui-sidebar)]">
        <div className="grid grid-cols-3 gap-1">
          {/* 1. Mẫu */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'templates' })}
            aria-current={viewState.type === 'templates' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium ios-interactive transition-colors cursor-pointer ${
              viewState.type === 'templates'
                ? 'bg-[#EAEAEC] text-[var(--ui-text)] font-semibold'
                : 'hover:bg-[var(--ui-selected)] text-[var(--ui-text)]'
            }`}
            title="Mẫu ghi chú"
          >
            <LayoutGrid className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)] shrink-0" />
            <span className={isNarrowFooter ? "sr-only" : "whitespace-nowrap"}>Mẫu</span>
            <span className="hidden"> ghi chú</span>
          </button>

          {/* 2. Thư viện */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'library' })}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium ios-interactive transition-colors cursor-pointer ${
              viewState.type === 'library'
                ? 'bg-[#EAEAEC] text-[var(--ui-text)] font-semibold'
                : 'hover:bg-[var(--ui-selected)] text-[var(--ui-text)]'
            }`}
            title="Thư viện"
          >
            <BookOpen className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)] shrink-0" />
            <span className={isNarrowFooter ? "sr-only" : "whitespace-nowrap"}>Thư viện</span>
          </button>

          {/* 3. Thùng rác */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'trash' })}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium ios-interactive transition-colors cursor-pointer relative ${
              viewState.type === 'trash'
                ? 'bg-[#EAEAEC] text-[var(--ui-text)] font-semibold'
                : 'hover:bg-[var(--ui-selected)] text-[var(--ui-text)]'
            }`}
            title="Thùng rác"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
              {isNarrowFooter && trashDocs.length > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] text-[9px] font-bold text-white theme-primary bg-[var(--ui-primary)] rounded-full flex items-center justify-center">
                  {trashDocs.length}
                </span>
              )}
            </div>
            <span className={isNarrowFooter ? "sr-only" : "whitespace-nowrap"}>Thùng rác</span>
            {!isNarrowFooter && trashDocs.length > 0 && (
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono px-1 py-0.2 rounded bg-[var(--ui-border)] shrink-0">
                {trashDocs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating Document Context Menu matching screenshot image_e2aa3a85.png */}
      {docMenuState.isOpen && docMenuState.doc && (
        <div
          ref={docMenuRef}
          className="fixed z-50 w-64 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-2xl py-1 text-xs text-[var(--ui-text)] animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#F2F2F7]"
          style={{
            top: `${docMenuState.position.top}px`,
            left: `${docMenuState.position.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Section 1: Trang Operations */}
          <div className="py-1">
            <div className="px-3 pt-1 pb-1 text-[11px] font-semibold text-[var(--ui-tertiary)]">
              Trang
            </div>

            {/* 1. Thêm vào mục Yêu thích */}
            <button
              type="button"
              onClick={() => {
                onToggleFavorite?.(docMenuState.doc!.id);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <Star
                className={`w-3.5 h-3.5 stroke-[1.75] ${
                  docMenuState.doc.isFavorite
                    ? 'fill-[#1D1D1F] text-[var(--ui-text)]'
                    : 'text-[var(--ui-text)]'
                }`}
              />
              <span>
                {docMenuState.doc.isFavorite
                  ? 'Xóa khỏi mục Yêu thích'
                  : 'Thêm vào mục Yêu thích'}
              </span>
            </button>

            {/* 2. Đổi tên (Ctrl+Shift+R) */}
            <button
              type="button"
              onClick={() => {
                setRenamingDocId(docMenuState.doc!.id);
                setRenameTitle(docMenuState.doc!.title);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Đổi tên</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+R</span>
            </button>

            {/* 3. Di chuyển đến (Ctrl+Shift+P) */}
            <button
              type="button"
              onClick={() => {
                onMoveDocumentRequest?.(docMenuState.doc!);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Di chuyển đến</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+P</span>
            </button>

            {/* 4. Chuyển vào Thùng rác */}
            <button
              type="button"
              onClick={() => {
                onSoftDeleteDocument?.(docMenuState.doc!.id);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
              <span>Chuyển vào Thùng rác</span>
            </button>

            {/* 5. Sao chép liên kết */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(documentUrl(window.location.origin, docMenuState.doc!.id));
                onToast?.('Đã sao chép liên kết vào bộ nhớ tạm');
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
              <span>Sao chép liên kết</span>
            </button>

            {/* 6. Sao chép (Ctrl+D) */}
            <button
              type="button"
              onClick={() => {
                onDuplicateDocument?.(docMenuState.doc!.id);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Copy className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Sao chép</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+D</span>
            </button>
          </div>

          {/* Section 2: Mở trong tab mới & Mở ở chế độ xem nhanh */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                window.open(documentUrl(window.location.origin, docMenuState.doc!.id), '_blank', 'noopener,noreferrer');
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Mở trong tab mới</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+↵</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate({ type: 'document', documentId: docMenuState.doc!.id });
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <PanelRight className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Mở ở chế độ xem nhanh</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Alt+Click</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog on Drag and Drop */}
      <ConfirmMoveDialog
        isOpen={confirmMoveState.isOpen}
        doc={confirmMoveState.doc}
        targetFolder={confirmMoveState.targetFolder}
        targetSpace={confirmMoveState.targetSpace}
        currentLocationName={confirmMoveState.currentLocationName}
        targetLocationName={confirmMoveState.targetLocationName}
        onConfirm={handleConfirmMove}
        onClose={() =>
          setConfirmMoveState({
            isOpen: false,
            doc: null,
            targetFolder: null,
            targetSpace: 'personal',
            currentLocationName: '',
            targetLocationName: '',
          })
        }
      />

      {/* Move Folder Modal */}
      <MoveFolderModal
        folder={moveFolderModal.folder}
        folders={folders}
        isOpen={moveFolderModal.isOpen}
        onClose={() => setMoveFolderModal({ isOpen: false, folder: null })}
        onMove={(folderId, targetParentId, targetSpace) => {
          onMoveFolder?.(folderId, targetParentId, targetSpace);
          setMoveFolderModal({ isOpen: false, folder: null });
        }}
        onToast={onToast}
      />

      {/* Resizer Handle on right border */}
      <div
        onMouseDown={handleStartResizing}
        onDoubleClick={handleResetWidth}
        className="absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-40 group flex items-center justify-center select-none"
        title="Kéo sang trái/phải để thay đổi độ rộng (Nhấp đúp để đặt lại mặc định)"
      >
        <div
          className={`w-[2px] h-full transition-colors ${
            isResizing ? 'bg-[var(--ui-primary)]' : 'bg-transparent group-hover:bg-[var(--ui-primary)]/30'
          }`}
        />
      </div>
    </aside>
  );
};
