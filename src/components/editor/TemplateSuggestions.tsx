import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Calendar, FileText, Target, Users, X } from 'lucide-react';
import { TEMPLATES } from '../../data/mockData';
import { SlashCommandPreview } from './SlashCommandPreview';

type Template = (typeof TEMPLATES)[number];
const icons: Record<string, typeof FileText> = {
  tpl_personal_note: FileText, tpl_meeting_minutes: Users, tpl_work_plan: Target,
  tpl_weekly_plan: Calendar, tpl_internal_doc: BookOpen,
};

export function TemplateSuggestions({ templates, onSelect, onDismiss }: {
  templates: Template[];
  onSelect: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [hover, setHover] = useState<{ id: string; left: number; bottom: number; maxHeight: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepOpen = () => {
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  const leave = () => {
    keepOpen();
    hideTimer.current = setTimeout(() => { setHover(null); hideTimer.current = null; }, 180);
  };
  useEffect(() => {
    const close = () => { keepOpen(); setHover(null); };
    window.addEventListener('resize', close);
    return () => { keepOpen(); window.removeEventListener('resize', close); };
  }, []);
  const preview = templates.find(template => template.id === hover?.id);
  return <div aria-label="Mẫu tài liệu" className="no-print shrink-0 px-[5%] pb-5 pt-3 bg-[var(--ui-surface)]">
    <p className="mb-2 text-center text-xs text-[var(--ui-muted)]">Tạo nhanh bằng các mẫu</p>
    <div className="flex items-center gap-2 overflow-x-auto py-1" onScroll={() => setHover(null)}>
      {templates.map(template => {
        const Icon = icons[template.id] || FileText;
        return <div key={template.id} onMouseEnter={event => {
          keepOpen();
          const rect = event.currentTarget.getBoundingClientRect();
          setHover({ id: template.id, left: Math.max(12, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 332)),
            bottom: Math.max(12, window.innerHeight - rect.top + 10), maxHeight: Math.max(100, rect.top - 22) });
        }} onMouseLeave={leave}
          className="inline-flex shrink-0 first:ml-auto last:mr-auto items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text-secondary)]">
          <button type="button" onClick={() => { keepOpen(); setHover(null); onSelect(template.id); }}
            className="inline-flex items-center gap-1.5 rounded-l-full py-1.5 pl-3 pr-1.5 hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)] transition-colors">
            <Icon className="h-3.5 w-3.5" />{template.title}
          </button>
          <button type="button" aria-label={`Ẩn mẫu ${template.title}`} title="Ẩn mẫu"
            onClick={() => { keepOpen(); setHover(null); onDismiss(template.id); }}
            className="mr-1 rounded-full p-1 hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)] transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>;
      })}
    </div>
    {preview && hover && createPortal(<div role="button" tabIndex={0} aria-label={`Áp dụng mẫu ${preview.title}`} title="Bấm để áp dụng mẫu" data-template-preview={preview.id}
      onMouseEnter={keepOpen} onMouseLeave={leave}
      onClick={() => { keepOpen(); setHover(null); onSelect(preview.id); }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          keepOpen(); setHover(null); onSelect(preview.id);
        }
      }}
      style={{ left: hover.left, bottom: hover.bottom, maxHeight: hover.maxHeight, width: 'min(320px, calc(100vw - 24px))' }}
      className="no-print fixed z-50 flex flex-col overflow-hidden rounded-lg bg-[#262626] p-2 shadow-xl cursor-pointer transition-[box-shadow,transform] hover:ring-2 hover:ring-[var(--ui-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] active:scale-[0.99] [&>[data-command-preview-content]]:min-h-0 [&>[data-command-preview-content]]:max-h-80">
      <SlashCommandPreview command={{ id: preview.id, templateId: preview.id, title: preview.title,
        subtitle: preview.description, type: 'paragraph', category: 'Mẫu tài liệu' }} />
    </div>, document.body)}
  </div>;
}
