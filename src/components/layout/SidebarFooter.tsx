import React from 'react';
import { BookOpen, LayoutGrid, LucideIcon, Pencil, Trash2 } from 'lucide-react';
import { ViewState } from '../../types';

interface SidebarFooterProps {
  viewState: ViewState;
  trashCount: number;
  onNavigate: (view: ViewState) => void;
  onQuickNote?: () => void;
}

interface FooterActionItem {
  id: 'templates' | 'library' | 'trash' | 'quick_note';
  label: string;
  shortcut?: string;
  target?: ViewState;
  onAction?: () => void;
  icon: LucideIcon;
  badgeCount?: number;
  tooltipPositionClass: string;
  arrowPositionClass: string;
}

/** Icon-only sidebar footer bar with hover/focus name tooltips and a trash count badge. */
export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  viewState,
  trashCount,
  onNavigate,
  onQuickNote,
}) => {
  const items: FooterActionItem[] = [
    {
      id: 'templates',
      label: 'Mẫu ghi chú',
      target: { type: 'templates' },
      icon: LayoutGrid,
      tooltipPositionClass: 'left-0',
      arrowPositionClass: 'left-6',
    },
    {
      id: 'library',
      label: 'Thư viện',
      target: { type: 'library' },
      icon: BookOpen,
      tooltipPositionClass: 'left-1/2 -translate-x-1/2',
      arrowPositionClass: 'left-1/2 -translate-x-1/2',
    },
    {
      id: 'trash',
      label: 'Thùng rác',
      target: { type: 'trash' },
      icon: Trash2,
      badgeCount: trashCount,
      tooltipPositionClass: 'left-1/2 -translate-x-1/2',
      arrowPositionClass: 'left-1/2 -translate-x-1/2',
    },
    {
      id: 'quick_note',
      label: 'Quick Note',
      shortcut: 'Ctrl + /',
      onAction: onQuickNote,
      icon: Pencil,
      tooltipPositionClass: 'right-0',
      arrowPositionClass: 'right-6',
    },
  ];

  return (
    <div className="p-2 border-t border-[var(--ui-border)] bg-[var(--ui-sidebar)] shrink-0">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.target ? viewState.type === item.id : false;
          const badge = item.badgeCount ?? 0;

          return (
            <div key={item.id} className="relative group/footer-item">
              <button
                type="button"
                onClick={() => (item.target ? onNavigate(item.target) : item.onAction?.())}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`w-full flex items-center justify-center p-2 rounded-xl text-xs font-medium ios-interactive transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#EAEAEC] text-[var(--ui-text)] font-semibold'
                    : 'hover:bg-[var(--ui-selected)] text-[var(--ui-text)]'
                }`}
              >
                <span className="relative flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] text-[9px] font-bold text-white theme-primary bg-[var(--ui-primary)] rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="sr-only">{item.label}</span>
              </button>
              <div
                role="tooltip"
                className={`pointer-events-none absolute bottom-full mb-2 z-50 whitespace-nowrap bg-[#262626] text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 scale-95 transition-all duration-100 group-hover/footer-item:opacity-100 group-hover/footer-item:scale-100 flex flex-col items-start ${item.tooltipPositionClass}`}
              >
                <span className="leading-tight">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] text-white/50 font-normal leading-tight mt-0.5">
                    {item.shortcut}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-1 w-2 h-2 rotate-45 bg-[#262626] ${item.arrowPositionClass}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
