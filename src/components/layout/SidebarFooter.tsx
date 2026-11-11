import React from 'react';
import { BookOpen, LayoutGrid, LucideIcon, Trash2 } from 'lucide-react';
import { ViewState } from '../../types';

interface SidebarFooterProps {
  viewState: ViewState;
  trashCount: number;
  onNavigate: (view: ViewState) => void;
}

interface FooterActionItem {
  id: 'templates' | 'library' | 'trash';
  label: string;
  target: ViewState;
  icon: LucideIcon;
  badgeCount?: number;
}

/** Icon-only sidebar footer bar with hover/focus name tooltips and a trash count badge. */
export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  viewState,
  trashCount,
  onNavigate,
}) => {
  const items: FooterActionItem[] = [
    { id: 'templates', label: 'Mẫu ghi chú', target: { type: 'templates' }, icon: LayoutGrid },
    { id: 'library', label: 'Thư viện', target: { type: 'library' }, icon: BookOpen },
    { id: 'trash', label: 'Thùng rác', target: { type: 'trash' }, icon: Trash2, badgeCount: trashCount },
  ];

  return (
    <div className="p-2 border-t border-[var(--ui-border)] bg-[var(--ui-sidebar)] shrink-0">
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = viewState.type === item.id;
          const badge = item.badgeCount ?? 0;

          return (
            <div key={item.id} className="relative group/footer-item">
              <button
                type="button"
                onClick={() => onNavigate(item.target)}
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
                className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-[#262626] text-white text-[10px] font-medium px-2.5 py-1 rounded-md shadow-lg opacity-0 scale-95 transition-all duration-100 group-hover/footer-item:opacity-100 group-hover/footer-item:scale-100 group-focus-within/footer-item:opacity-100 group-focus-within/footer-item:scale-100"
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#262626]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
