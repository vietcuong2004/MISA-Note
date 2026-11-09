import React, { useState, useEffect, useRef } from 'react';
import {
  Repeat,
  Palette,
  Link2,
  Copy,
  CornerUpRight,
  Trash2,
  MessageSquare,
  Pencil,
  Sparkles,
  Zap,
  ChevronRight,
  Check,
  FileText,
  FileSpreadsheet,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Sigma,
  RefreshCw,
  Columns2,
  Columns3,
} from 'lucide-react';
import { BlockType } from '../../types';

export interface EditTextDialogProps {
  isOpen: boolean;
  position: {
    top: number;
    left: number;
    selectionTop?: number;
    selectionBottom?: number;
  };
  selectedText: string;
  blockId?: string | null;
  blockType?: BlockType;
  authorName?: string;
  updatedTime?: string;
  onClose: () => void;
  onTurnInto?: (newType: BlockType, extra?: any) => void;
  onApplyColor?: (color: string, isBg?: boolean) => void;
  onCopyLink?: () => void;
  onDuplicate?: () => void;
  onMoveTo?: () => void;
  onDelete?: () => void;
  onComment?: (text: string) => void;
  onSuggestEdit?: (text: string) => void;
  onAskAI?: (text: string) => void;
  onSkillAction?: (skillId: string, text: string) => void;
}

type SubmenuType = 'turnInto' | 'color' | 'skills' | null;

interface TurnIntoOption {
  id: string;
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  headingLevel?: number;
  hasChevron?: boolean;
}

const TURN_INTO_OPTIONS: TurnIntoOption[] = [
  { id: 'paragraph', type: 'paragraph', label: 'Văn bản', icon: <span className="font-serif font-bold text-sm leading-none">T</span> },
  { id: 'h1', type: 'h1', label: 'Đề mục 1', icon: <span className="font-bold text-xs leading-none">H₁</span> },
  { id: 'h2', type: 'h2', label: 'Đề mục 2', icon: <span className="font-bold text-xs leading-none">H₂</span> },
  { id: 'h3', type: 'h3', label: 'Đề mục 3', icon: <span className="font-bold text-xs leading-none">H₃</span> },
  { id: 'h4', type: 'h4', label: 'Đề mục 4', icon: <span className="font-bold text-xs leading-none">H₄</span> },
  { id: 'page', type: 'link', label: 'Trang', icon: <FileText className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'subpage', type: 'link', label: 'Trang trong', icon: <FileSpreadsheet className="w-4 h-4 stroke-[1.75]" />, hasChevron: true },
  { id: 'bullet', type: 'bullet', label: 'Danh sách có dấu đầu dòng', icon: <List className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'numbered', type: 'numbered', label: 'Danh sách được đánh số', icon: <ListOrdered className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'checklist', type: 'checklist', label: 'Danh sách việc cần làm', icon: <CheckSquare className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'toggle', type: 'toggle', label: 'Danh sách có thể thu gọn', icon: <ChevronRight className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'code', type: 'code', label: 'Mã', icon: <Code className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'quote', type: 'quote', label: 'Trích dẫn', icon: <Quote className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'callout', type: 'callout', label: 'Khung chú thích', icon: <MessageSquare className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'equation', type: 'code', label: 'Phương trình thành phần', icon: <Sigma className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'synced', type: 'paragraph', label: 'Thành phần nội dung đồng bộ', icon: <RefreshCw className="w-4 h-4 stroke-[1.75]" /> },
  { id: 'toggle_h1', type: 'toggle', label: 'Đề mục chuyển đổi 1', icon: <span className="font-bold text-xs leading-none">▸H₁</span>, headingLevel: 1 },
  { id: 'toggle_h2', type: 'toggle', label: 'Đề mục có thể thu gọn 2', icon: <span className="font-bold text-xs leading-none">▸H₂</span>, headingLevel: 2 },
  { id: 'toggle_h3', type: 'toggle', label: 'Đề mục chuyển đổi 3', icon: <span className="font-bold text-xs leading-none">▸H₃</span>, headingLevel: 3 },
  { id: 'toggle_h4', type: 'toggle', label: 'Đề mục chuyển đổi 4', icon: <span className="font-bold text-xs leading-none">▸H₄</span>, headingLevel: 4 },
  { id: '2cols', type: 'table', label: '2 cột', icon: <Columns2 className="w-4 h-4 stroke-[1.75]" /> },
  { id: '3cols', type: 'table', label: '3 cột', icon: <Columns3 className="w-4 h-4 stroke-[1.75]" /> },
];

const COLOR_OPTIONS: { name: string; textClass: string; hex: string }[] = [
  { name: 'Mặc định', textClass: 'text-[var(--ui-text)]', hex: '#1D1D1F' },
  { name: 'Xám', textClass: 'text-gray-600', hex: '#6B7280' },
  { name: 'Nâu', textClass: 'text-amber-800', hex: '#92400E' },
  { name: 'Cam', textClass: 'text-orange-600', hex: '#EA580C' },
  { name: 'Vàng', textClass: 'text-yellow-600', hex: '#CA8A04' },
  { name: 'Lục', textClass: 'text-green-600', hex: '#16A34A' },
  { name: 'Lam', textClass: 'text-blue-600', hex: '#2563EB' },
  { name: 'Tím', textClass: 'text-purple-600', hex: '#9333EA' },
  { name: 'Hồng', textClass: 'text-pink-600', hex: '#DB2777' },
  { name: 'Đỏ', textClass: 'text-red-600', hex: '#DC2626' },
];

const SKILL_OPTIONS = [
  { id: 'summarize', label: 'Tóm tắt nội dung', icon: '📋' },
  { id: 'rewrite', label: 'Viết lại văn phong tự nhiên', icon: '✍️' },
  { id: 'fixSpelling', label: 'Sửa lỗi chính tả & ngữ pháp', icon: '🔍' },
  { id: 'translateEn', label: 'Dịch sang tiếng Anh', icon: '🌐' },
  { id: 'translateVi', label: 'Dịch sang tiếng Việt', icon: '🇻🇳' },
];

export const EditTextDialog: React.FC<EditTextDialogProps> = ({
  isOpen,
  position,
  selectedText,
  blockId: _blockId,
  blockType = 'paragraph',
  authorName = 'Việt Cường Vương',
  updatedTime = 'Hôm nay lúc 11:30',
  onClose,
  onTurnInto,
  onApplyColor,
  onCopyLink,
  onDuplicate,
  onMoveTo,
  onDelete,
  onComment,
  onSuggestEdit,
  onAskAI,
  onSkillAction,
}) => {
  const [search, setSearch] = useState('');
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset search and submenu when opening without stealing focus from editor
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate word and character count
  const trimmed = selectedText.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = selectedText.length;

  // Filter actions for search
  const query = search.trim().toLowerCase();
  const matchesSearch = (text: string) => {
    if (!query) return true;
    return text.toLowerCase().includes(query);
  };

  const dialogWidth = 270;
  const submenuWidth = 245;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const selBottom = position.selectionBottom !== undefined ? position.selectionBottom : position.top;
  const selTop = position.selectionTop !== undefined ? position.selectionTop : position.top - 24;

  const spaceBelow = viewportHeight - selBottom;
  const spaceAbove = selTop;

  // If there is not enough space below (< 320px) and more space above, flip to display above
  const placeAbove = spaceBelow < 320 && spaceAbove > spaceBelow;

  const left = Math.max(12, Math.min(position.left, viewportWidth - dialogWidth - 16));
  const showSubmenuOnLeft = left + dialogWidth + submenuWidth + 16 > viewportWidth && left >= submenuWidth + 12;

  // Dynamic available height preventing overflow
  const maxAvailableHeight = placeAbove
    ? Math.max(220, Math.min(480, selTop - 16))
    : Math.max(220, Math.min(480, viewportHeight - selBottom - 16));

  const positionStyle: React.CSSProperties = placeAbove
    ? { bottom: `${Math.max(12, viewportHeight - selTop + 8)}px`, left: `${left}px` }
    : { top: `${Math.max(12, selBottom + 8)}px`, left: `${left}px` };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Định dạng văn bản"
      className={`fixed z-50 flex select-none animate-in fade-in zoom-in-95 duration-100 ${
        placeAbove ? 'items-end' : 'items-start'
      }`}
      style={positionStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* MENU CẤP 1 (Primary Menu) */}
      <div
        className="w-[270px] bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-2xl overflow-hidden text-xs text-[var(--ui-text)] flex flex-col shrink-0"
        style={{ maxHeight: `${Math.min(480, maxAvailableHeight)}px` }}
      >
        {/* 1. Search Input */}
        <div className="p-2 border-b border-[var(--ui-border)]">
          <div className="relative flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm hành động…"
              className="w-full h-7 pl-2.5 pr-6 text-xs rounded-lg border border-[#2383E2] bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[#2383E2] placeholder:text-[var(--ui-tertiary)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 text-[var(--ui-tertiary)] hover:text-[var(--ui-text)]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 2. Menu 1 Actions list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--ui-border)]">
          {/* Section 1: Text category */}
          <div className="p-1 space-y-0.5">
            <div className="px-2.5 pt-1.5 pb-0.5 text-[11px] font-semibold text-[var(--ui-tertiary)]">
              Văn bản
            </div>

            {matchesSearch('chuyển thành') && (
              <button
                type="button"
                onClick={() => setActiveSubmenu((prev) => (prev === 'turnInto' ? null : 'turnInto'))}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                  activeSubmenu === 'turnInto' ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Chuyển thành</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]" />
              </button>
            )}

            {matchesSearch('màu') && (
              <button
                type="button"
                onClick={() => setActiveSubmenu((prev) => (prev === 'color' ? null : 'color'))}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                  activeSubmenu === 'color' ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Màu</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]" />
              </button>
            )}
          </div>

          {/* Section 2: Actions with shortcuts */}
          <div className="p-1 space-y-0.5">
            {matchesSearch('sao chép liên kết đến thành phần nội dung') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onCopyLink?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Link2 className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75] shrink-0" />
                  <span className="truncate">Sao chép liên kết đến t...</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono whitespace-nowrap">
                  Alt+⇧+L
                </span>
              </button>
            )}

            {matchesSearch('sao chép') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onDuplicate?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Sao chép</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+D</span>
              </button>
            )}

            {matchesSearch('di chuyển đến') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onMoveTo?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CornerUpRight className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Di chuyển đến</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+P</span>
              </button>
            )}

            {matchesSearch('xóa') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onDelete?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-colors cursor-pointer group text-red-600"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 stroke-[1.75]" />
                  <span>Xóa</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] group-hover:text-red-500 font-mono">
                  Del
                </span>
              </button>
            )}
          </div>

          {/* Section 3: Collaboration */}
          <div className="p-1 space-y-0.5">
            {matchesSearch('bình luận') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onComment?.(selectedText);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Bình luận</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+M</span>
              </button>
            )}

            {matchesSearch('đề xuất chỉnh sửa') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onSuggestEdit?.(selectedText);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Pencil className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Đề xuất chỉnh sửa</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono whitespace-nowrap">
                  Ctrl+⇧+Alt+X
                </span>
              </button>
            )}
          </div>

          {/* Section 4: AI & Skills */}
          <div className="p-1 space-y-0.5">
            {matchesSearch('hỏi ai') && (
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onAskAI?.(selectedText);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[var(--ui-primary)] stroke-[1.75]" />
                  <span>Hỏi AI</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+J</span>
              </button>
            )}

            {matchesSearch('kỹ năng') && (
              <button
                type="button"
                onClick={() => setActiveSubmenu((prev) => (prev === 'skills' ? null : 'skills'))}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                  activeSubmenu === 'skills' ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Kỹ năng</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Footer: Author info & Word/Character Count */}
        <div className="px-3 py-2.5 border-t border-[var(--ui-border)] bg-[var(--ui-subtle)] text-[11px] space-y-1">
          <div className="text-[var(--ui-tertiary)] font-medium">Lần chỉnh sửa gần nhất</div>
          <div className="flex items-center gap-1.5 text-[var(--ui-text)]">
            <div className="w-4 h-4 rounded-full bg-[var(--ui-hover)] border border-[var(--ui-border)] flex items-center justify-center text-[9px] font-bold shrink-0">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium truncate">{authorName}</span>
          </div>
          <div className="text-[var(--ui-tertiary)]">{updatedTime}</div>
          <div className="text-[var(--ui-tertiary)]">
            {wordCount} từ, {charCount} ký tự
          </div>
        </div>
      </div>

      {/* MENU CẤP 2 (Secondary Submenu displayed SIDE-BY-SIDE beside Menu 1) */}
      {activeSubmenu && (
        <div
          className={`w-[245px] bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-2xl overflow-hidden text-xs text-[var(--ui-text)] flex flex-col shrink-0 animate-in fade-in duration-100 ${
            showSubmenuOnLeft ? 'mr-1.5 order-first' : 'ml-1.5'
          }`}
          style={{ maxHeight: `${Math.min(420, maxAvailableHeight)}px` }}
        >
          {/* SUBMENU: CHUYỂN THÀNH (Turn into) matching user screenshot */}
          {activeSubmenu === 'turnInto' && (
            <div className="p-1 space-y-0.5 overflow-y-auto">
              {TURN_INTO_OPTIONS.map((opt) => {
                const isSelected = blockType === opt.type && (opt.headingLevel ? true : true);
                const isParagraph = opt.id === 'paragraph' && blockType === 'paragraph';
                const isH1 = opt.id === 'h1' && blockType === 'h1';
                const isH2 = opt.id === 'h2' && blockType === 'h2';
                const isH3 = opt.id === 'h3' && blockType === 'h3';
                const isH4 = opt.id === 'h4' && blockType === 'h4';
                const isBullet = opt.id === 'bullet' && blockType === 'bullet';
                const isNumbered = opt.id === 'numbered' && blockType === 'numbered';
                const isChecklist = opt.id === 'checklist' && blockType === 'checklist';
                const isCode = opt.id === 'code' && blockType === 'code';
                const isQuote = opt.id === 'quote' && blockType === 'quote';
                const isCallout = opt.id === 'callout' && blockType === 'callout';
                const isToggle = opt.id === 'toggle' && blockType === 'toggle';

                const isActive =
                  isParagraph ||
                  isH1 ||
                  isH2 ||
                  isH3 ||
                  isH4 ||
                  isBullet ||
                  isNumbered ||
                  isChecklist ||
                  isCode ||
                  isQuote ||
                  isCallout ||
                  isToggle;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onTurnInto?.(opt.type, opt.headingLevel ? { headingLevel: opt.headingLevel } : undefined);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                      isActive ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-4 h-4 flex items-center justify-center text-[var(--ui-text)] shrink-0">
                        {opt.icon}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isActive ? (
                      <Check className="w-3.5 h-3.5 text-[var(--ui-text)] shrink-0" />
                    ) : opt.hasChevron ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--ui-tertiary)] shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {/* SUBMENU: MÀU (Color options) */}
          {activeSubmenu === 'color' && (
            <div className="p-1 space-y-2 overflow-y-auto">
              <div>
                <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--ui-tertiary)] uppercase">
                  Màu chữ
                </div>
                <div className="space-y-0.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={`text-${c.name}`}
                      type="button"
                      onClick={() => {
                        onApplyColor?.(c.hex, false);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left cursor-pointer"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className={c.textClass}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-[var(--ui-border)]">
                <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--ui-tertiary)] uppercase">
                  Màu nền đánh dấu
                </div>
                <div className="space-y-0.5">
                  {COLOR_OPTIONS.slice(1).map((c) => (
                    <button
                      key={`bg-${c.name}`}
                      type="button"
                      onClick={() => {
                        onApplyColor?.(c.hex, true);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left cursor-pointer"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded border border-black/10 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>Nền {c.name.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUBMENU: KỸ NĂNG AI (AI Skills) */}
          {activeSubmenu === 'skills' && (
            <div className="p-1 space-y-0.5 overflow-y-auto">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => {
                    onSkillAction?.(skill.id, selectedText);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
                >
                  <span className="text-sm shrink-0">{skill.icon}</span>
                  <span className="truncate">{skill.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
