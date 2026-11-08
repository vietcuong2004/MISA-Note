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
} from 'lucide-react';
import { Document, Folder as FolderType, SpaceType, UserRole, ViewState } from '../../types';
import { CURRENT_USER } from '../../data/mockData';
import { ConfirmMoveDialog } from '../modals/ConfirmMoveDialog';

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
  onCreateFolder: (space: SpaceType) => void;
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
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  folders,
  viewState,
  currentRole,
  collapsed,
  onToggleCollapse,
  sidebarWidth = 260,
  onWidthChange,
  onNavigate,
  onCreateDocument,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onRoleChange,
  onOpenSpotlight,
  onOpenOneAI,
  onCreateMeetingNote,
  onOpenTemplates,
  onOpenChat,
  onImportDoc,
  onToggleFavorite,
  onSoftDeleteDocument,
  onDuplicateDocument,
  onRenameDocument,
  onMoveDocumentRequest,
  onMoveDocument,
  onToast,
}) => {
  const DEFAULT_SIDEBAR_WIDTH = 260;
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
    onToast?.('Đã đặt lại độ rộng thanh bên về mặc định (260px)', 'info');
  };

  const [personalExpanded, setPersonalExpanded] = useState(true);
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [favoriteExpanded, setFavoriteExpanded] = useState(true);
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showAITooltip, setShowAITooltip] = useState(false);

  // Drag and Drop state
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRootSpace, setDragOverRootSpace] = useState<SpaceType | null>(null);

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

  const menuRef = useRef<HTMLDivElement>(null);
  const docMenuRef = useRef<HTMLDivElement>(null);

  const getLocationName = (doc: Document) => {
    const fld = folders.find((f) => f.id === doc.folderId);
    if (fld) {
      const spaceLabel = fld.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
      return `${spaceLabel} / ${fld.name}`;
    }
    return doc.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
  };

  const handlePromptMove = (
    docId: string,
    targetFolder: FolderType | null,
    targetSpace?: SpaceType
  ) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const resolvedSpace = targetFolder ? targetFolder.space : targetSpace || doc.space;

    // If destination is identical to current location, do not show modal
    if (doc.folderId === (targetFolder?.id || null) && doc.space === resolvedSpace) {
      onToast?.('Tài liệu đã ở trong thư mục này', 'info');
      return;
    }

    const currentLoc = getLocationName(doc);
    const targetLoc = targetFolder
      ? `${targetFolder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'} / ${targetFolder.name}`
      : `${resolvedSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}`;

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

    const folderName = targetFolder ? `thư mục "${targetFolder.name}"` : 'thư mục gốc';
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

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const activeDocs = documents.filter((d) => !d.isTrash);
  const trashDocs = documents.filter((d) => d.isTrash);

  const recentDocs = [...activeDocs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const favoriteDocs = activeDocs.filter((d) => d.isFavorite);

  const personalFolders = folders.filter((f) => f.space === 'personal');
  const companyFolders = folders.filter((f) => f.space === 'company');

  const personalRootDocs = activeDocs.filter(
    (d) => d.space === 'personal' && !d.folderId && d.id !== 'doc_meeting_notes'
  );
  const companyRootDocs = activeDocs.filter((d) => d.space === 'company' && !d.folderId);

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
    const isDragging = draggingDocId === doc.id;

    return (
      <div
        key={doc.id}
        draggable={!isRenaming}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', doc.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggingDocId(doc.id);
        }}
        onDragEnd={() => {
          setDraggingDocId(null);
          setDragOverFolderId(null);
          setDragOverRootSpace(null);
        }}
        onClick={() => {
          if (!isRenaming) {
            onNavigate({ type: 'document', documentId: doc.id });
          }
        }}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
          isRenaming ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'
        } ${
          isActive
            ? 'bg-[#E8F0FE] text-[#1967D2] font-semibold shadow-2xs'
            : 'hover:bg-[#EAEAEA] text-[#48484A]'
        } ${isDragging ? 'opacity-30 border border-dashed border-[#1D1D1F] bg-[#F2F2F7]' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {doc.icon === '💬' || doc.tags?.includes('Đoạn chat') ? (
            <MessageSquare className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isActive ? 'text-[#1967D2]' : 'text-[#1D1D1F]'}`} />
          ) : doc.type === 'meeting' ? (
            <Users className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isActive ? 'text-[#1967D2]' : 'text-[#1D1D1F]'}`} />
          ) : (
            <FileText className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${isActive ? 'text-[#1967D2]' : 'text-[#1D1D1F]'}`} />
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
              className="w-full text-xs bg-white border border-[#1D1D1F] rounded px-1.5 py-0.5 focus:outline-none"
            />
          ) : (
            <span className="truncate text-xs">{doc.title || 'Không có tiêu đề'}</span>
          )}
          {doc.isFavorite && (
            <Star className="w-2.5 h-2.5 fill-[#1D1D1F] text-[#1D1D1F] shrink-0" />
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
              className="p-1 rounded-md hover:bg-[#DCDCE0] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
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
                className="p-1 rounded-md hover:bg-[#DCDCE0] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
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

  // Rail Mode (when collapsed)
  if (collapsed) {
    return (
      <aside className="w-[64px] h-full bg-[#FAFAFA] border-r border-[#E5E5EA] flex flex-col items-center py-4 justify-between transition-all shrink-0 select-none">
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Expand Button */}
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] hover:bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F] ios-interactive shadow-2xs"
            title="Mở rộng thanh bên"
          >
            <PanelLeftOpen className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
          </button>

          <div className="w-8 h-[1px] bg-[#E5E5EA] my-1" />

          {/* Quick Note icon */}
          <button
            onClick={() => {
              setRecentExpanded(true);
              onCreateDocument('personal', null);
            }}
            className="w-10 h-10 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center ios-interactive shadow-xs"
            title="Tạo mới"
          >
            <SquarePen className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Quick Ask AI icon */}
          <button
            onClick={onOpenOneAI}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] hover:bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F] ios-interactive shadow-2xs"
            title="Hỏi AI"
          >
            <Sparkles className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Search Spotlight */}
          <button
            onClick={onOpenSpotlight}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] hover:bg-[#F2F2F7] flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] ios-interactive shadow-2xs"
            title="Tìm kiếm (Ctrl+K)"
          >
            <Search className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Gần đây */}
          <button
            onClick={() => onNavigate({ type: 'recent' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'recent'
                ? 'bg-[#EAEAEA] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:bg-[#F2F2F7]'
            }`}
            title="Gần đây"
          >
            <Clock className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Yêu thích */}
          <button
            onClick={() => onNavigate({ type: 'favorite' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'favorite'
                ? 'bg-[#EAEAEA] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:bg-[#F2F2F7]'
            }`}
            title="Yêu thích"
          >
            <Star className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Thư viện */}
          <button
            onClick={() => onNavigate({ type: 'library' })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ios-interactive ${
              viewState.type === 'library'
                ? 'bg-[#EAEAEA] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:bg-[#F2F2F7]'
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
                ? 'bg-[#1D1D1F] text-white shadow-xs'
                : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#EAEAEA]'
            }`}
            title="Thùng rác"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
            {trashDocs.length > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] text-[9px] font-bold text-white bg-[#1D1D1F] rounded-full flex items-center justify-center border border-white">
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
      className={`h-full bg-[#FAFAFA] border-r border-[#E5E5EA] flex flex-col justify-between select-none text-xs text-[#1D1D1F] shrink-0 relative ${
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
              className="w-9 h-9 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#EAEAEA] flex items-center justify-center text-[#1D1D1F] ios-interactive transition-colors shrink-0 cursor-pointer"
              title="Thu gọn thanh bên"
            >
              <ChevronsLeft className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Tạo mới button */}
            <button
              type="button"
              onClick={() => {
                setRecentExpanded(true);
                onCreateDocument('personal', null);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#1D1D1F] text-white hover:bg-black font-semibold text-xs transition-colors shadow-xs ios-interactive cursor-pointer"
              title="Tạo mới"
            >
              <SquarePen className="w-3.5 h-3.5 stroke-[2] shrink-0" />
              <span className="truncate">Tạo mới</span>
            </button>

            {/* Hỏi AI button with tooltip "Kết nối OneAI sắp ra mắt" */}
            <div className="relative">
              <button
                type="button"
                onClick={onOpenOneAI}
                onMouseEnter={() => setShowAITooltip(true)}
                onMouseLeave={() => setShowAITooltip(false)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E5E5EA] hover:bg-[#F2F2F7] text-[#1D1D1F] font-semibold text-xs transition-colors ios-interactive cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1D1D1F] stroke-[1.75]" />
                <span className="truncate">Hỏi AI</span>
              </button>

              {/* Dark Pill Tooltip matching screenshot: "Kết nối OneAI sắp ra mắt" */}
              {showAITooltip && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-[#1D1D1F] text-white text-[10px] font-medium px-2 py-1 rounded-md shadow-md animate-in fade-in duration-100 pointer-events-none">
                  Kết nối OneAI sắp ra mắt
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1D1D1F]" />
                </div>
              )}
            </div>

            {/* More button (•••) */}
            <button
              type="button"
              onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
              className="w-9 h-9 rounded-xl bg-white border border-[#E5E5EA] hover:bg-[#F2F2F7] text-[#1D1D1F] flex items-center justify-center ios-interactive shrink-0 cursor-pointer"
              title="Thao tác nhanh khác"
            >
              <MoreHorizontal className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
            </button>
          </div>

          {/* Floating Popover "Thao tác nhanh" matching screenshot */}
          {showQuickActionMenu && (
            <div className="absolute left-28 top-12 z-50 w-52 bg-white rounded-2xl ios-elevated-shadow border border-[#E5E5EA] py-2 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
              <div className="px-3.5 py-1 text-[11px] font-semibold text-[#86868B]">
                Thao tác nhanh
              </div>

              {/* 1. Ghi chú cuộc họp */}
              <button
                type="button"
                onClick={() => {
                  onCreateMeetingNote();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span>Ghi chú cuộc họp</span>
              </button>

              {/* 2. Tạo từ mẫu */}
              <button
                type="button"
                onClick={() => {
                  onOpenTemplates();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span>Tạo từ mẫu</span>
              </button>

              {/* 3. Nhập tài liệu */}
              <button
                type="button"
                onClick={() => {
                  onImportDoc();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span>Nhập tài liệu</span>
              </button>

              {/* 4. Thư mục mới */}
              <button
                type="button"
                onClick={() => {
                  onCreateFolder('personal');
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span>Thư mục mới</span>
              </button>

              {/* 5. Chat mới */}
              <button
                type="button"
                onClick={() => {
                  onOpenChat();
                  setShowQuickActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span>Chat mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Smart Sections: Gần đây & Yêu thích */}
        <div className="px-2 pt-2 space-y-1">
          {/* Section: Gần đây */}
          <div className="space-y-0.5">
            <div
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-[#1D1D1F] ios-interactive transition-colors ${
                viewState.type === 'recent'
                  ? 'bg-[#EAEAEA] text-[#1D1D1F] font-semibold'
                  : 'hover:bg-[#EAEAEA]'
              }`}
              onClick={() => setRecentExpanded(!recentExpanded)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#86868B]">
                  {recentExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                  )}
                </span>
                <Clock className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F] shrink-0" />
                <span className="text-xs font-medium truncate">Gần đây</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {recentDocs.length > 0 && (
                  <span className="text-[10px] text-[#86868B] font-mono px-1.5 py-0.2 rounded bg-[#E5E5EA]">
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
                  className="p-1 rounded hover:bg-[#DCDCE0] text-[#86868B] hover:text-[#1D1D1F] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Tạo ghi chú mới"
                >
                  <Plus className="w-3 h-3 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* List of recent documents right below "Gần đây" tab */}
            {recentExpanded && (
              <div className="pl-6 space-y-0.5 border-l border-[#E5E5EA] ml-3.5 my-0.5">
                {recentDocs.slice(0, 7).map((doc) => renderDocumentItem(doc, doc.folderId))}
                {recentDocs.length === 0 && (
                  <div className="text-[10px] text-[#86868B] italic px-2 py-1">
                    Chưa có ghi chú nào
                  </div>
                )}
                {recentDocs.length > 7 && (
                  <button
                    type="button"
                    onClick={() => onNavigate({ type: 'recent' })}
                    className="w-full text-left px-2 py-1 text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:underline font-medium cursor-pointer"
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
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-[#1D1D1F] ios-interactive transition-colors ${
                viewState.type === 'favorite'
                  ? 'bg-[#EAEAEA] text-[#1D1D1F] font-semibold'
                  : 'hover:bg-[#EAEAEA]'
              }`}
              onClick={() => setFavoriteExpanded(!favoriteExpanded)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#86868B]">
                  {favoriteExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                  )}
                </span>
                <Star className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F] fill-[#1D1D1F] shrink-0" />
                <span className="text-xs font-medium truncate">Yêu thích</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {favoriteDocs.length > 0 && (
                  <span className="text-[10px] text-[#86868B] font-mono px-1.5 py-0.2 rounded bg-[#E5E5EA]">
                    {favoriteDocs.length}
                  </span>
                )}
              </div>
            </div>

            {/* List of favorite documents right below "Yêu thích" tab */}
            {favoriteExpanded && (
              <div className="pl-6 space-y-0.5 border-l border-[#E5E5EA] ml-3.5 my-0.5">
                {favoriteDocs.map((doc) => renderDocumentItem(doc, doc.folderId))}
                {favoriteDocs.length === 0 && (
                  <div className="text-[10px] text-[#86868B] italic px-2 py-1">
                    Chưa có mục yêu thích
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 1: GHI CHÉP CỦA TÔI */}
        <div
          className={`px-2 pt-4 transition-all ${
            dragOverRootSpace === 'personal' ? 'bg-[#F2F2F7] ring-1 ring-dashed ring-[#1D1D1F] rounded-2xl' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverRootSpace !== 'personal') setDragOverRootSpace('personal');
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            if (dragOverRootSpace === 'personal') setDragOverRootSpace(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const docId = e.dataTransfer.getData('text/plain') || draggingDocId;
            setDragOverRootSpace(null);
            setDraggingDocId(null);
            if (docId) {
              handlePromptMove(docId, null, 'personal');
            }
          }}
        >
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-[#86868B] tracking-wider uppercase group">
            <button
              onClick={() => setPersonalExpanded(!personalExpanded)}
              className="flex items-center gap-1.5 hover:text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <span>GHI CHÉP CỦA TÔI</span>
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onCreateDocument('personal', null)}
                className="p-1 rounded-md hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                title="Tạo ghi chú mới"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {personalExpanded && (
            <div className="space-y-0.5 mt-1">
              {/* Personal Folders: Công việc, Ý tưởng, Cá nhân */}
              {personalFolders.map((folder) => {
                const folderDocs = activeDocs.filter((d) => d.folderId === folder.id);
                const isExpanded = !!expandedFolders[folder.id];
                const isDragOverFolder = dragOverFolderId === folder.id;

                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-[#1D1D1F] ios-interactive transition-all ${
                        isDragOverFolder
                          ? 'bg-[#1D1D1F]/10 ring-2 ring-[#1D1D1F] font-semibold scale-[1.02]'
                          : 'hover:bg-[#EAEAEA]'
                      }`}
                      onClick={(e) => toggleFolderExpand(folder.id, e)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverFolderId !== folder.id) {
                          setDragOverFolderId(folder.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        e.stopPropagation();
                        if (dragOverFolderId === folder.id) {
                          setDragOverFolderId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const docId = e.dataTransfer.getData('text/plain') || draggingDocId;
                        setDragOverFolderId(null);
                        setDraggingDocId(null);
                        if (docId) {
                          handlePromptMove(docId, folder);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#86868B]">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                          )}
                        </span>
                        <FolderIcon
                          className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${
                            isDragOverFolder ? 'text-[#1D1D1F] fill-[#1D1D1F]/20' : 'text-[#1D1D1F]'
                          }`}
                        />
                        <span className="truncate font-medium text-xs">{folder.name}</span>
                        {isDragOverFolder && (
                          <span className="text-[10px] text-[#1D1D1F] font-normal italic ml-1">
                            (Thả vào đây)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateDocument('personal', folder.id);
                          }}
                          className="p-1 rounded hover:bg-[#DCDCE0] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                          title="Thêm tài liệu vào thư mục"
                        >
                          <Plus className="w-3 h-3 stroke-[2]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFolder(folder);
                          }}
                          className="p-1 rounded hover:bg-[#DCDCE0] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3 h-3 stroke-[1.75]" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-documents inside folder with hover action icons [+] and [···] */}
                    {isExpanded && (
                      <div className="pl-6 space-y-0.5 border-l border-[#E5E5EA] ml-3.5 my-0.5">
                        {folderDocs.map((doc) => renderDocumentItem(doc, folder.id))}
                        {folderDocs.length === 0 && (
                          <div className="text-[10px] text-[#86868B] italic px-2 py-1">
                            Thư mục trống
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unfiled Personal Documents: Ghi chú chưa phân loại */}
              {personalRootDocs.map((doc) => renderDocumentItem(doc, null))}
            </div>
          )}
        </div>

        {/* Section 2: TÀI LIỆU CÔNG TY */}
        <div
          className={`px-2 pt-4 transition-all ${
            dragOverRootSpace === 'company' ? 'bg-[#F2F2F7] ring-1 ring-dashed ring-[#1D1D1F] rounded-2xl' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverRootSpace !== 'company') setDragOverRootSpace('company');
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            if (dragOverRootSpace === 'company') setDragOverRootSpace(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const docId = e.dataTransfer.getData('text/plain') || draggingDocId;
            setDragOverRootSpace(null);
            setDraggingDocId(null);
            if (docId) {
              handlePromptMove(docId, null, 'company');
            }
          }}
        >
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-[#86868B] tracking-wider uppercase group">
            <button
              onClick={() => setCompanyExpanded(!companyExpanded)}
              className="flex items-center gap-1.5 hover:text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <span>TÀI LIỆU CÔNG TY</span>
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onCreateDocument('company', null)}
                className="p-1 rounded-md hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                title="Tạo tài liệu công ty mới"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {companyExpanded && (
            <div className="space-y-0.5 mt-1">
              {/* Company Folders: Dự án, Quy trình, Tài liệu sản phẩm */}
              {companyFolders.map((folder) => {
                const folderDocs = activeDocs.filter((d) => d.folderId === folder.id);
                const isExpanded = !!expandedFolders[folder.id];
                const isDragOverFolder = dragOverFolderId === folder.id;

                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-[#1D1D1F] ios-interactive transition-all ${
                        isDragOverFolder
                          ? 'bg-[#1D1D1F]/10 ring-2 ring-[#1D1D1F] font-semibold scale-[1.02]'
                          : 'hover:bg-[#EAEAEA]'
                      }`}
                      onClick={(e) => toggleFolderExpand(folder.id, e)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverFolderId !== folder.id) {
                          setDragOverFolderId(folder.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        e.stopPropagation();
                        if (dragOverFolderId === folder.id) {
                          setDragOverFolderId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const docId = e.dataTransfer.getData('text/plain') || draggingDocId;
                        setDragOverFolderId(null);
                        setDraggingDocId(null);
                        if (docId) {
                          handlePromptMove(docId, folder);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#86868B]">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                          )}
                        </span>
                        <FolderIcon
                          className={`w-3.5 h-3.5 stroke-[1.75] shrink-0 ${
                            isDragOverFolder ? 'text-[#1D1D1F] fill-[#1D1D1F]/20' : 'text-[#1D1D1F]'
                          }`}
                        />
                        <span className="truncate font-medium text-xs">{folder.name}</span>
                        {isDragOverFolder && (
                          <span className="text-[10px] text-[#1D1D1F] font-normal italic ml-1">
                            (Thả vào đây)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateDocument('company', folder.id);
                          }}
                          className="p-1 rounded hover:bg-[#DCDCE0] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                          title="Thêm tài liệu"
                        >
                          <Plus className="w-3 h-3 stroke-[2]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFolder(folder);
                          }}
                          className="p-1 rounded hover:bg-[#DCDCE0] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3 h-3 stroke-[1.75]" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-documents inside folder */}
                    {isExpanded && (
                      <div className="pl-6 space-y-0.5 border-l border-[#E5E5EA] ml-3.5 my-0.5">
                        {folderDocs.map((doc) => renderDocumentItem(doc, folder.id))}
                        {folderDocs.length === 0 && (
                          <div className="text-[10px] text-[#86868B] italic px-2 py-1">
                            Thư mục trống
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unfiled Company Documents */}
              {companyRootDocs.map((doc) => renderDocumentItem(doc, null))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Fixed Utilities: Thư viện & Thùng rác trên 1 hàng */}
      <div className="p-2 border-t border-[#E5E5EA] bg-[#FAFAFA]">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Thư viện */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'library' })}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ios-interactive transition-colors cursor-pointer ${
              viewState.type === 'library'
                ? 'bg-[#EAEAEC] text-[#1D1D1F] font-semibold'
                : 'hover:bg-[#EAEAEA] text-[#1D1D1F]'
            }`}
            title="Thư viện"
          >
            <BookOpen className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F] shrink-0" />
            <span className="truncate">Thư viện</span>
          </button>

          {/* Thùng rác */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'trash' })}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ios-interactive transition-colors cursor-pointer relative ${
              viewState.type === 'trash'
                ? 'bg-[#EAEAEC] text-[#1D1D1F] font-semibold'
                : 'hover:bg-[#EAEAEA] text-[#1D1D1F]'
            }`}
            title="Thùng rác"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F] shrink-0" />
            <span className="truncate">Thùng rác</span>
            {trashDocs.length > 0 && (
              <span className="text-[10px] text-[#86868B] font-mono px-1 py-0.2 rounded bg-[#E5E5EA]">
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
          className="fixed z-50 w-64 bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl py-1 text-xs text-[#1D1D1F] animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#F2F2F7]"
          style={{
            top: `${docMenuState.position.top}px`,
            left: `${docMenuState.position.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Section 1: Trang Operations */}
          <div className="py-1">
            <div className="px-3 pt-1 pb-1 text-[11px] font-semibold text-[#86868B]">
              Trang
            </div>

            {/* Thêm vào mục Yêu thích */}
            <button
              type="button"
              onClick={() => {
                onToggleFavorite?.(docMenuState.doc!.id);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <Star
                className={`w-3.5 h-3.5 stroke-[1.75] ${
                  docMenuState.doc.isFavorite
                    ? 'fill-[#1D1D1F] text-[#1D1D1F]'
                    : 'text-[#1D1D1F]'
                }`}
              />
              <span>
                {docMenuState.doc.isFavorite
                  ? 'Xóa khỏi mục Yêu thích'
                  : 'Thêm vào mục Yêu thích'}
              </span>
            </button>

            {/* Sao chép liên kết */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                onToast?.('Đã sao chép liên kết vào bộ nhớ tạm');
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
              <span>Sao chép liên kết</span>
            </button>

            {/* Sao chép (Ctrl+D) */}
            <button
              type="button"
              onClick={() => {
                onDuplicateDocument?.(docMenuState.doc!.id);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Copy className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                <span>Sao chép</span>
              </div>
              <span className="text-[10px] text-[#86868B] font-mono">Ctrl+D</span>
            </button>

            {/* Đổi tên (Ctrl+Shift+R) */}
            <button
              type="button"
              onClick={() => {
                setRenamingDocId(docMenuState.doc!.id);
                setRenameTitle(docMenuState.doc!.title);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                <span>Đổi tên</span>
              </div>
              <span className="text-[10px] text-[#86868B] font-mono">Ctrl+⇧+R</span>
            </button>

            {/* Di chuyển đến (Ctrl+Shift+P) */}
            <button
              type="button"
              onClick={() => {
                onMoveDocumentRequest?.(docMenuState.doc!);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                <span>Di chuyển đến</span>
              </div>
              <span className="text-[10px] text-[#86868B] font-mono">Ctrl+⇧+P</span>
            </button>

            {/* Chuyển vào Thùng rác */}
            <button
              type="button"
              onClick={() => {
                onSoftDeleteDocument?.(docMenuState.doc!.id);
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
              <span>Chuyển vào Thùng rác</span>
            </button>
          </div>

          {/* Section 2: Mở trong tab mới & Mở ở chế độ xem nhanh */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onNavigate({ type: 'document', documentId: docMenuState.doc!.id });
                onToast?.('Đã mở tài liệu trong tab mới');
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                <span>Mở trong tab mới</span>
              </div>
              <span className="text-[10px] text-[#86868B] font-mono">Ctrl+⇧+↵</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate({ type: 'document', documentId: docMenuState.doc!.id });
                closeDocMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <PanelRight className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                <span>Mở ở chế độ xem nhanh</span>
              </div>
              <span className="text-[10px] text-[#86868B] font-mono">Alt+Click</span>
            </button>
          </div>

          {/* Footer: Lần chỉnh sửa gần nhất */}
          <div className="px-3 pt-2 pb-1.5 text-[11px] text-[#86868B]">
            <div>Lần chỉnh sửa gần nhất</div>
            <div className="flex items-center gap-1.5 text-[#1D1D1F] font-semibold mt-1">
              <span className="w-4 h-4 rounded-full bg-[#E5E5EA] text-[9px] flex items-center justify-center font-bold">
                {docMenuState.doc.author?.name ? docMenuState.doc.author.name[0] : 'V'}
              </span>
              <span className="truncate">
                {docMenuState.doc.author?.name || 'Vương Việt Cường'}
              </span>
            </div>
            <div className="text-[10px] text-[#86868B] mt-0.5">
              Hôm nay lúc{' '}
              {new Date(docMenuState.doc.updatedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
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

      {/* Resizer Handle on right border */}
      <div
        onMouseDown={handleStartResizing}
        onDoubleClick={handleResetWidth}
        className="absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-40 group flex items-center justify-center select-none"
        title="Kéo sang trái/phải để thay đổi độ rộng (Nhấp đúp để đặt lại mặc định)"
      >
        <div
          className={`w-[2px] h-full transition-colors ${
            isResizing ? 'bg-[#1D1D1F]' : 'bg-transparent group-hover:bg-[#1D1D1F]/30'
          }`}
        />
      </div>
    </aside>
  );
};
