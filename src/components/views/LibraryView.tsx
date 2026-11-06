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
  Calendar,
  LayoutGrid,
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
} from 'lucide-react';
import { Document, Folder, SpaceType } from '../../types';

interface LibraryViewProps {
  documents: Document[];
  folders: Folder[];
  onOpenDocument: (docId: string) => void;
  onToggleFavorite: (docId: string) => void;
  onSoftDeleteDocument: (docId: string) => void;
  onCreateDocument?: (space: SpaceType, folderId?: string | null) => void;
  onOpenTemplates?: () => void;
  onImportDoc?: () => void;
  onCreateFolder?: (space: SpaceType) => void;
  onRecordAudioNote?: () => void;
  onDuplicateDocument?: (docId: string) => void;
  onRenameDocument?: (docId: string, newTitle: string) => void;
  onMoveDocumentRequest?: (doc: Document) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
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
  onToast,
}) => {
  // Navigation Tab matching screenshot: Tất cả, Của tôi, Công ty, Được chia sẻ, Cuộc họp, Mẫu
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'company' | 'shared' | 'meeting' | 'template'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Row context menu state
  const [activeRowDoc, setActiveRowDoc] = useState<Document | null>(null);
  const [rowMenuPos, setRowMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Inline rename
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

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

  const activeDocs = useMemo(() => documents.filter((d) => !d.isTrash), [documents]);

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
          if (doc.space !== 'personal' && doc.author?.name !== 'Việt Cường') return false;
        } else if (activeTab === 'company') {
          if (doc.space !== 'company') return false;
        } else if (activeTab === 'shared') {
          if (!doc.tags.includes('Được chia sẻ') && doc.space !== 'company') return false;
        } else if (activeTab === 'meeting') {
          if (doc.type !== 'meeting') return false;
        } else if (activeTab === 'template') {
          if (!doc.tags.includes('Mẫu') && doc.type !== 'plan') return false;
        }

        // 2. Dropdown type filter
        if (selectedType !== 'all') {
          if (selectedType === 'note' && doc.type !== 'note') return false;
          if (selectedType === 'meeting' && doc.type !== 'meeting') return false;
          if (selectedType === 'internal_doc' && doc.type !== 'internal_doc') return false;
          if (selectedType === 'template' && !doc.tags.includes('Mẫu')) return false;
        }

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
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === 'updated_asc') {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortBy === 'title_asc') {
          return a.title.localeCompare(b.title, 'vi');
        }
        return 0;
      });
  }, [activeDocs, activeTab, selectedType, selectedFolderId, selectedAuthor, searchQuery, sortBy]);

  // Relative time formatter matching image_59ef5bd1.png: "14 phút trước", "1 giờ trước", "Hôm qua", "2 ngày trước"
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Helper for Location string (Vị trí) matching screenshot: "Của tôi • Công việc", "Công ty • Dự án", "Được chia sẻ"
  const getLocationString = (doc: Document) => {
    if (doc.tags.includes('Được chia sẻ')) {
      return 'Được chia sẻ';
    }
    const folder = folders.find((f) => f.id === doc.folderId);
    if (folder) {
      const spaceName = folder.space === 'personal' ? 'Của tôi' : 'Công ty';
      return `${spaceName} • ${folder.name}`;
    }
    if (doc.space === 'personal') {
      return 'Của tôi • Chưa phân loại';
    }
    return 'Công ty';
  };

  // Helper for Type Badge pill matching screenshot: [📄 Ghi chú], [📅 Cuộc họp], [📄 Tài liệu], [⊞ Mẫu]
  const getTypeBadge = (doc: Document) => {
    if (doc.tags.includes('Mẫu') || (doc.type === 'plan' && doc.title.toLowerCase().includes('mẫu'))) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAEAEC] text-[#1D1D1F]">
          <LayoutGrid className="w-3 h-3 stroke-[1.75]" />
          <span>Mẫu</span>
        </span>
      );
    }
    if (doc.type === 'meeting' || doc.tags.includes('Cuộc họp')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAEAEC] text-[#1D1D1F]">
          <Calendar className="w-3 h-3 stroke-[1.75]" />
          <span>Cuộc họp</span>
        </span>
      );
    }
    if (doc.type === 'internal_doc' || doc.space === 'company') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAEAEC] text-[#1D1D1F]">
          <FileText className="w-3 h-3 stroke-[1.75]" />
          <span>Tài liệu</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAEAEC] text-[#1D1D1F]">
        <FileText className="w-3 h-3 stroke-[1.75]" />
        <span>Ghi chú</span>
      </span>
    );
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

  const handleSaveRename = (docId: string) => {
    if (renameTitle.trim()) {
      onRenameDocument?.(docId, renameTitle.trim());
    }
    setRenamingDocId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto select-none">
      <div className="max-w-6xl w-full mx-auto px-6 md:px-10 pt-8 pb-16 space-y-5">
        {/* Top Header Row matching image_59ef5bd1.png */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1D1D1F] tracking-tight">Thư viện</h1>
            <p className="text-xs text-[#86868B] mt-1.5 font-normal">
              Tất cả ghi chú và tài liệu bạn có quyền truy cập.
            </p>
          </div>

          {/* Split Button: [+ Ghi chú mới | ▾] */}
          <div className="relative shrink-0" ref={newDocMenuRef}>
            <div className="inline-flex rounded-xl shadow-xs overflow-hidden bg-[#1D1D1F]">
              <button
                type="button"
                onClick={() => onCreateDocument?.('personal', null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Ghi chú mới</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewDocMenu(!showNewDocMenu)}
                className="px-2.5 py-2 text-white hover:bg-black border-l border-white/20 transition-colors cursor-pointer"
                title="Tùy chọn khác"
              >
                <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Split Dropdown Menu matching screenshot */}
            {showNewDocMenu && (
              <div className="absolute right-0 top-11 z-50 w-52 bg-white rounded-2xl border border-[#E5E5EA] shadow-xl py-1 text-xs text-[#1D1D1F] animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenTemplates?.();
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                  <span>Tạo từ mẫu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportDoc?.();
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                  <span>Nhập tài liệu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCreateFolder?.('personal');
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                  <span>Tạo thư mục</span>
                </button>
                <div className="border-t border-[#F2F2F7] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    onRecordAudioNote?.();
                    setShowNewDocMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F2F2F7] transition-colors cursor-pointer text-[#1D1D1F]"
                >
                  <Mic className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
                  <span>Ghi âm thành ghi chú</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Navigation Tabs matching image_59ef5bd1.png */}
        <div className="flex items-center gap-6 border-b border-[#E5E5EA] text-xs pt-1 overflow-x-auto">
          {/* 1. Tất cả */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'border-b-2 border-[#1D1D1F] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <FileText className="w-4 h-4 stroke-[1.75]" />
            <span>Tất cả</span>
          </button>

          {/* 2. Của tôi */}
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'mine'
                ? 'border-b-2 border-[#1D1D1F] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <User className="w-4 h-4 stroke-[1.75]" />
            <span>Của tôi</span>
          </button>

          {/* 3. Công ty */}
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'company'
                ? 'border-b-2 border-[#1D1D1F] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <Building2 className="w-4 h-4 stroke-[1.75]" />
            <span>Công ty</span>
          </button>

          {/* 4. Được chia sẻ */}
          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'shared'
                ? 'border-b-2 border-[#1D1D1F] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <Users className="w-4 h-4 stroke-[1.75]" />
            <span>Được chia sẻ</span>
          </button>

          {/* 5. Cuộc họp */}
          <button
            type="button"
            onClick={() => setActiveTab('meeting')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'meeting'
                ? 'border-b-2 border-[#1D1D1F] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <Calendar className="w-4 h-4 stroke-[1.75]" />
            <span>Cuộc họp</span>
          </button>

          {/* 6. Mẫu */}
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 pb-2.5 font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'template'
                ? 'border-b-2 border-[#1D1D1F] text-[#1D1D1F] font-bold'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 stroke-[1.75]" />
            <span>Mẫu</span>
          </button>
        </div>

        {/* Filters and View Controls Toolbar matching image_59ef5bd1.png */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Left Controls: Search + Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input: [🔍 Tìm trong thư viện...] */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm trong thư viện..."
                className="pl-8 pr-3 py-1.5 w-52 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:border-[#1D1D1F] transition-colors"
              />
            </div>

            {/* Loại tài liệu ▾ */}
            <div className="relative" ref={typeMenuRef}>
              <button
                type="button"
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-white transition-colors cursor-pointer ${
                  selectedType !== 'all'
                    ? 'border-[#1D1D1F] text-[#1D1D1F] font-semibold bg-[#F2F2F7]'
                    : 'border-[#E5E5EA] text-[#48484A] hover:bg-[#F2F2F7]'
                }`}
              >
                <span>
                  {selectedType === 'all'
                    ? 'Loại tài liệu'
                    : selectedType === 'note'
                    ? 'Ghi chú'
                    : selectedType === 'meeting'
                    ? 'Cuộc họp'
                    : selectedType === 'internal_doc'
                    ? 'Tài liệu'
                    : 'Mẫu'}
                </span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[#86868B]" />
              </button>

              {showTypeMenu && (
                <div className="absolute left-0 top-9 z-40 w-44 bg-white rounded-2xl border border-[#E5E5EA] shadow-xl py-1 text-xs text-[#1D1D1F] animate-in zoom-in-95 duration-100">
                  {[
                    { id: 'all', label: 'Tất cả loại' },
                    { id: 'note', label: 'Ghi chú' },
                    { id: 'meeting', label: 'Cuộc họp' },
                    { id: 'internal_doc', label: 'Tài liệu' },
                    { id: 'template', label: 'Mẫu' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.id);
                        setShowTypeMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                        selectedType === item.id ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
                      }`}
                    >
                      <span>{item.label}</span>
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-white transition-colors cursor-pointer ${
                  selectedFolderId !== 'all'
                    ? 'border-[#1D1D1F] text-[#1D1D1F] font-semibold bg-[#F2F2F7]'
                    : 'border-[#E5E5EA] text-[#48484A] hover:bg-[#F2F2F7]'
                }`}
              >
                <span>
                  {selectedFolderId === 'all'
                    ? 'Thư mục'
                    : folders.find((f) => f.id === selectedFolderId)?.name || 'Thư mục'}
                </span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[#86868B]" />
              </button>

              {showFolderMenu && (
                <div className="absolute left-0 top-9 z-40 w-48 bg-white rounded-2xl border border-[#E5E5EA] shadow-xl py-1 text-xs text-[#1D1D1F] animate-in zoom-in-95 duration-100 max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolderId('all');
                      setShowFolderMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                      selectedFolderId === 'all' ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
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
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                        selectedFolderId === f.id ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
                      }`}
                    >
                      <span className="truncate">{f.name}</span>
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-white transition-colors cursor-pointer ${
                  selectedAuthor !== 'all'
                    ? 'border-[#1D1D1F] text-[#1D1D1F] font-semibold bg-[#F2F2F7]'
                    : 'border-[#E5E5EA] text-[#48484A] hover:bg-[#F2F2F7]'
                }`}
              >
                <span>{selectedAuthor === 'all' ? 'Người tạo' : selectedAuthor === 'me' ? 'Bạn' : selectedAuthor}</span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[#86868B]" />
              </button>

              {showAuthorMenu && (
                <div className="absolute left-0 top-9 z-40 w-44 bg-white rounded-2xl border border-[#E5E5EA] shadow-xl py-1 text-xs text-[#1D1D1F] animate-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAuthor('all');
                      setShowAuthorMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                      selectedAuthor === 'all' ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
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
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                      selectedAuthor === 'me' ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
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
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                          selectedAuthor === author ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E5EA] text-xs font-medium bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.75] text-[#86868B]" />
                <span>
                  {sortBy === 'updated_desc'
                    ? 'Mới cập nhật'
                    : sortBy === 'updated_asc'
                    ? 'Cũ nhất trước'
                    : 'Tên (A-Z)'}
                </span>
                <ChevronDown className="w-3 h-3 stroke-[2] text-[#86868B]" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-9 z-40 w-44 bg-white rounded-2xl border border-[#E5E5EA] shadow-xl py-1 text-xs text-[#1D1D1F] animate-in zoom-in-95 duration-100">
                  {[
                    { id: 'updated_desc', label: 'Mới cập nhật' },
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
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#F2F2F7] transition-colors cursor-pointer ${
                        sortBy === s.id ? 'font-semibold text-[#1D1D1F]' : 'text-[#48484A]'
                      }`}
                    >
                      <span>{s.label}</span>
                      {sortBy === s.id && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle: [☰] [⊞] */}
            <div className="inline-flex items-center p-0.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#1D1D1F] shadow-2xs font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
                title="Dạng danh sách"
              >
                <ListIcon className="w-3.5 h-3.5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#1D1D1F] shadow-2xs font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
                title="Dạng lưới"
              >
                <Grid className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

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
              className="p-1.5 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#F2F2F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </div>

        {/* Batch actions bar when items are checked */}
        {selectedDocIds.size > 0 && (
          <div className="p-2.5 px-4 rounded-xl bg-[#1D1D1F] text-white text-xs flex items-center justify-between animate-in fade-in duration-100">
            <span>Đã chọn {selectedDocIds.size} tài liệu</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  selectedDocIds.forEach((id) => onSoftDeleteDocument(id));
                  setSelectedDocIds(new Set());
                }}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors"
              >
                Chuyển vào thùng rác
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
          <div className="p-12 text-center border border-[#E5E5EA] rounded-2xl bg-white space-y-2">
            <p className="text-xs font-semibold text-[#1D1D1F]">Không tìm thấy tài liệu phù hợp</p>
            <p className="text-xs text-[#86868B]">Hãy thử chuyển sang tab khác hoặc xóa bộ lọc.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* Table View exactly matching image_59ef5bd1.png */
          <div className="border-t border-[#E5E5EA]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] text-[#86868B] font-medium">
                  {/* Select All Checkbox */}
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#C7C7CC] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-[#86868B]">Tên tài liệu</th>
                  <th className="py-2.5 px-3 font-medium text-[#86868B] w-32">Loại</th>
                  <th className="py-2.5 px-3 font-medium text-[#86868B] w-48">Vị trí</th>
                  <th className="py-2.5 px-3 font-medium text-[#86868B] w-32">Người tạo</th>
                  <th className="py-2.5 px-3 font-medium text-[#86868B] w-32">Cập nhật</th>
                  <th className="py-2.5 px-2 w-10 text-center">···</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7]">
                {filteredDocs.map((doc) => {
                  const isChecked = selectedDocIds.has(doc.id);
                  const isRenaming = renamingDocId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => {
                        if (!isRenaming) onOpenDocument(doc.id);
                      }}
                      className="hover:bg-[#F8F8FA] cursor-pointer transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-2 text-center" onClick={(e) => toggleSelectDoc(doc.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-[#C7C7CC] cursor-pointer"
                        />
                      </td>

                      {/* Tên tài liệu: Star + Icon + Title */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Favorite Star Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(doc.id);
                            }}
                            className="text-[#86868B] hover:text-[#1D1D1F] transition-colors shrink-0 cursor-pointer"
                            title={doc.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                          >
                            <Star
                              className={`w-3.5 h-3.5 stroke-[1.75] ${
                                doc.isFavorite ? 'fill-[#1D1D1F] text-[#1D1D1F]' : 'text-[#AEAEB2]'
                              }`}
                            />
                          </button>

                          {/* Document Icon */}
                          <span className="text-[#1D1D1F] shrink-0">
                            {doc.type === 'meeting' ? (
                              <Calendar className="w-4 h-4 stroke-[1.75]" />
                            ) : doc.tags.includes('Mẫu') ? (
                              <LayoutGrid className="w-4 h-4 stroke-[1.75]" />
                            ) : (
                              <FileText className="w-4 h-4 stroke-[1.75]" />
                            )}
                          </span>

                          {/* Title / Inline Rename */}
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
                              className="text-xs font-semibold bg-white border border-[#1D1D1F] rounded px-1.5 py-0.5 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold text-[#1D1D1F] group-hover:underline truncate">
                              {doc.title || 'Không có tiêu đề'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Loại badge */}
                      <td className="py-3 px-3">{getTypeBadge(doc)}</td>

                      {/* Vị trí */}
                      <td className="py-3 px-3 text-[#6E6E73] truncate">{getLocationString(doc)}</td>

                      {/* Người tạo */}
                      <td className="py-3 px-3 text-[#6E6E73]">{getAuthorDisplay(doc)}</td>

                      {/* Cập nhật */}
                      <td className="py-3 px-3 text-[#86868B] whitespace-nowrap">
                        {getRelativeTime(doc.updatedAt)}
                      </td>

                      {/* More actions: ··· */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleOpenRowMenu(doc, e)}
                          className="p-1 rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors cursor-pointer"
                          title="Tùy chọn khác"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.75]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc.id)}
                className="p-4 rounded-2xl border border-[#E5E5EA] bg-white hover:border-[#1D1D1F] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between h-40 space-y-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">
                      {doc.type === 'meeting' ? '📅' : doc.tags.includes('Mẫu') ? '⊞' : '📄'}
                    </span>
                    {getTypeBadge(doc)}
                  </div>
                  <h3 className="text-xs font-bold text-[#1D1D1F] mt-2 line-clamp-1 group-hover:underline">
                    {doc.title || 'Không có tiêu đề'}
                  </h3>
                  <p className="text-[11px] text-[#86868B] mt-0.5 line-clamp-1">
                    {getLocationString(doc)}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F2F2F7] flex items-center justify-between text-[11px] text-[#86868B]">
                  <span>{getAuthorDisplay(doc)}</span>
                  <span>{getRelativeTime(doc.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info matching image_59ef5bd1.png: "8 tài liệu" and "Chỉ hiển thị nội dung bạn có quyền truy cập." */}
        <div className="pt-4 flex items-center justify-between text-xs text-[#86868B]">
          <span>{filteredDocs.length} tài liệu</span>
          <span>Chỉ hiển thị nội dung bạn có quyền truy cập.</span>
        </div>
      </div>

      {/* Row More Actions Popover Menu */}
      {activeRowDoc && (
        <div
          ref={rowMenuRef}
          className="fixed z-50 w-56 bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl py-1 text-xs text-[#1D1D1F] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: `${rowMenuPos.top}px`, left: `${rowMenuPos.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Yêu thích */}
          <button
            type="button"
            onClick={() => {
              onToggleFavorite(activeRowDoc.id);
              setActiveRowDoc(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            <Star
              className={`w-3.5 h-3.5 stroke-[1.75] ${
                activeRowDoc.isFavorite ? 'fill-[#1D1D1F] text-[#1D1D1F]' : 'text-[#1D1D1F]'
              }`}
            />
            <span>{activeRowDoc.isFavorite ? 'Xóa khỏi Yêu thích' : 'Thêm vào Yêu thích'}</span>
          </button>

          {/* 2. Sao chép liên kết */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              onToast?.('Đã sao chép liên kết vào bộ nhớ tạm');
              setActiveRowDoc(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
            <span>Sao chép liên kết</span>
          </button>

          {/* 3. Sao chép / Nhân bản */}
          <button
            type="button"
            onClick={() => {
              onDuplicateDocument?.(activeRowDoc.id);
              setActiveRowDoc(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
            <span>Sao chép</span>
          </button>

          {/* 4. Đổi tên */}
          <button
            type="button"
            onClick={() => {
              setRenamingDocId(activeRowDoc.id);
              setRenameTitle(activeRowDoc.title);
              setActiveRowDoc(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
            <span>Đổi tên</span>
          </button>

          {/* 5. Di chuyển đến */}
          <button
            type="button"
            onClick={() => {
              onMoveDocumentRequest?.(activeRowDoc);
              setActiveRowDoc(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.75] text-[#1D1D1F]" />
            <span>Di chuyển đến</span>
          </button>

          <div className="border-t border-[#F2F2F7] my-1" />

          {/* 6. Xóa vào thùng rác */}
          <button
            type="button"
            onClick={() => {
              onSoftDeleteDocument(activeRowDoc.id);
              setActiveRowDoc(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer text-[#1D1D1F]"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Chuyển vào Thùng rác</span>
          </button>
        </div>
      )}
    </div>
  );
};
