import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { Star, Edit2, ArrowRight, Trash2, Share2, Copy } from 'lucide-react';

export interface DocumentActionMenuProps {
  isOpen: boolean;
  isFavorite?: boolean;
  onClose: () => void;
  onToggleFavorite?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  position?: { top: number; left: number };
  className?: string;
  headerTitle?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const DocumentActionMenu = forwardRef<HTMLDivElement, DocumentActionMenuProps>(
  (
    {
      isOpen,
      isFavorite = false,
      onClose,
      onToggleFavorite,
      onRename,
      onMove,
      onShare,
      onDelete,
      onDuplicate,
      position,
      className = '',
      headerTitle = 'Tiện ích',
      triggerRef,
    },
    ref
  ) => {
    const innerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (triggerRef?.current && triggerRef.current.contains(target)) {
          return;
        }
        if (innerRef.current && !innerRef.current.contains(target)) {
          onClose();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    const basePositionClass = position
      ? 'fixed z-50'
      : 'absolute right-0 top-9 z-40';

    return (
      <div
        ref={innerRef}
        role="menu"
        aria-label="Thao tác tài liệu"
        className={`${basePositionClass} w-64 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-2xl py-1 text-xs text-[var(--ui-text)] animate-in fade-in zoom-in-95 duration-100 ${className}`}
        style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-1">
          {headerTitle && (
            <div className="px-3 pt-1 pb-1 text-[11px] font-semibold text-[var(--ui-tertiary)]">
              {headerTitle}
            </div>
          )}

          {/* 1. Thêm vào mục Yêu thích / Xóa khỏi mục Yêu thích */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => {
                onToggleFavorite();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <Star
                className={`w-3.5 h-3.5 stroke-[1.75] ${
                  isFavorite
                    ? 'fill-[#1D1D1F] text-[var(--ui-text)]'
                    : 'text-[var(--ui-text)]'
                }`}
              />
              <span>
                {isFavorite ? 'Xóa khỏi mục Yêu thích' : 'Thêm vào mục Yêu thích'}
              </span>
            </button>
          )}

          {onDuplicate && <button type="button" onClick={() => { onDuplicate(); onClose(); }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer">
            <Copy className="w-3.5 h-3.5" /><span>Nhân bản</span>
          </button>}
          {/* 2. Đổi tên (Ctrl+Shift+R) */}
          {onRename && (
            <button
              type="button"
              onClick={() => {
                onRename();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Đổi tên</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+R</span>
            </button>
          )}

          {/* 3. Di chuyển đến (Ctrl+Shift+P) */}
          {onMove && (
            <button
              type="button"
              onClick={() => {
                onMove();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
                <span>Di chuyển đến</span>
              </div>
              <span className="text-[10px] text-[var(--ui-tertiary)] font-mono">Ctrl+⇧+P</span>
            </button>
          )}

          {onShare && <button type="button" onClick={() => { onShare(); onClose(); }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer">
            <Share2 className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Chia sẻ</span>
          </button>}

          {/* 4. Chuyển vào Thùng rác */}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)]" />
              <span>Chuyển vào Thùng rác</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

DocumentActionMenu.displayName = 'DocumentActionMenu';
