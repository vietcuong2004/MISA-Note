import React from 'react';
import { BookOpen, Calendar, FileText, Target, Users, X } from 'lucide-react';
import { TEMPLATES } from '../../data/mockData';

interface QuickActionMenuProps {
  positionClassName: string;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tpl_personal_note: FileText,
  tpl_meeting_minutes: Users,
  tpl_work_plan: Target,
  tpl_weekly_plan: Calendar,
  tpl_internal_doc: BookOpen,
};

/** Shared sidebar "..." quick-action popover listing all 5 quick document templates. */
export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  positionClassName,
  onClose,
  onSelectTemplate,
}) => {
  return (
    <div
      id="quick-action-dialog"
      role="dialog"
      aria-label="Thao tác nhanh"
      className={`absolute ${positionClassName} z-50 w-52 max-h-[calc(100dvh-120px)] overflow-y-auto bg-[var(--ui-surface)] rounded-2xl ios-elevated-shadow border border-[var(--ui-border)] py-2 animate-in fade-in zoom-in-95 duration-100 space-y-0.5`}
    >
      <div className="px-3.5 py-1 flex items-center justify-between text-[11px] font-semibold text-[var(--ui-tertiary)]">
        <span>Thao tác nhanh</span>
        <button
          type="button"
          autoFocus
          aria-label="Đóng thao tác nhanh"
          title="Đóng thao tác nhanh"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {TEMPLATES.map((template) => {
        const Icon = TEMPLATE_ICONS[template.id] || FileText;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              onSelectTemplate(template.id);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
          >
            <Icon className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75] shrink-0" />
            <span className="truncate">{template.title}</span>
          </button>
        );
      })}
    </div>
  );
};
