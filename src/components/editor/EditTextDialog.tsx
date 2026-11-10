import React, { useState, useEffect, useRef } from 'react';
import {
  Repeat,
  Palette,
  Copy,
  Trash2,
  ChevronRight,
  Check,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import { BlockProperties, BlockType } from '../../types';

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
  formatting?: BlockProperties;
  onFormat?: (patch: Partial<BlockProperties>) => void;
  onCopyLink?: () => void;
  onDuplicate?: () => void;
  onMoveTo?: () => void;
  onDelete?: () => void;
  onComment?: (text: string) => void;
  onSuggestEdit?: (text: string) => void;
  onAskAI?: (text: string) => void;
  onSkillAction?: (skillId: string, text: string) => void;
}

type SubmenuType = 'turnInto' | 'color' | null;

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

export const EditTextDialog: React.FC<EditTextDialogProps> = ({
  isOpen,
  position,
  blockId: _blockId,
  blockType = 'paragraph',
  onClose,
  onTurnInto,
  onApplyColor,
  formatting = {},
  onFormat,
  onDuplicate,
  onDelete,
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset submenu without stealing focus from the editor
  useEffect(() => {
    if (isOpen) {
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

  const dialogWidth = 320;
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
        className="w-[320px] bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-2xl overflow-hidden text-xs text-[var(--ui-text)] flex flex-col shrink-0"
        style={{ maxHeight: `${Math.min(480, maxAvailableHeight)}px` }}
      >
        <div role="toolbar" aria-label="Định dạng nhanh" className="grid grid-cols-[32px_32px_32px_minmax(0,1fr)_76px] items-center gap-1.5 border-b border-[var(--ui-border)] p-3">
          {([{ key: 'bold', label: 'Đậm', Icon: Bold }, { key: 'italic', label: 'Nghiêng', Icon: Italic }, { key: 'underline', label: 'Gạch chân', Icon: Underline }] as const).map(({ key, label, Icon }) =>
            <button key={key} type="button" title={label} aria-label={label} aria-pressed={!!formatting[key]}
              onMouseDown={event => event.preventDefault()} onClick={() => onFormat?.({ [key]: !formatting[key] })}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${formatting[key] ? 'bg-blue-100 text-blue-600' : 'bg-[var(--ui-hover)] hover:bg-[var(--ui-hover-strong)]'}`}>
              <Icon className="h-4 w-4" />
            </button>)}
          <select aria-label="Font chữ" value={formatting.fontFamily || 'Arial'} onChange={event => onFormat?.({ fontFamily: event.target.value })}
            className="h-8 w-full min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-2 outline-none focus:ring-2 focus:ring-[#2383e2]/30">
            {['Arial', 'Times New Roman', 'Calibri', 'Verdana', 'Georgia', 'Tahoma', 'Courier New'].map(font => <option key={font} value={font}>{font}</option>)}
          </select>
          <select aria-label="Cỡ chữ" value={formatting.fontSize || 14} onChange={event => onFormat?.({ fontSize: Number(event.target.value) })}
            className="h-8 w-full min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-2 outline-none focus:ring-2 focus:ring-[#2383e2]/30">
            {Array.from(new Set([10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72, formatting.fontSize || 14])).sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
        {/* 2. Menu 1 Actions list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--ui-border)]">
          {/* Section 1: Text category */}
          <div className="p-2 space-y-1">
            <div className="px-2.5 pt-1.5 pb-0.5 text-[11px] font-semibold text-[var(--ui-tertiary)]">
              Văn bản
            </div>

              <button
                type="button"
                onClick={() => setActiveSubmenu((prev) => (prev === 'turnInto' ? null : 'turnInto'))}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group ${
                  activeSubmenu === 'turnInto' ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Định dạng</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSubmenu((prev) => (prev === 'color' ? null : 'color'))}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group ${
                  activeSubmenu === 'color' ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Màu</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]" />
              </button>
          </div>

          {/* Section 2: Actions with shortcuts */}
          <div className="p-2 space-y-1">


              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onDuplicate?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[var(--ui-hover)] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                  <span>Sao chép</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+D</span>
              </button>



              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  onDelete?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-colors cursor-pointer group text-red-600"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 stroke-[1.75]" />
                  <span>Xóa</span>
                </div>
                <span className="text-[10px] text-[var(--ui-tertiary)] group-hover:text-red-500 font-mono">
                  Del
                </span>
              </button>
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
          {/* SUBMENU: ĐỊNH DẠNG */}
          {activeSubmenu === 'turnInto' && (
            <div className="p-1 space-y-0.5 overflow-y-auto">
              {TURN_INTO_OPTIONS.map((opt) => {
                const isActive = blockType === opt.type;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onTurnInto?.(opt.type, opt.headingLevel ? { headingLevel: opt.headingLevel } : undefined);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group ${
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
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--ui-hover)] text-left cursor-pointer"
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
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--ui-hover)] text-left cursor-pointer"
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

        </div>
      )}
    </div>
  );
};
