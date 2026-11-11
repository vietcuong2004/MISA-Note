import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Type, Heading1, Heading2, Heading3, Heading4, List, ListOrdered, CheckSquare,
  Table, Lightbulb, Image, Video, Music, File,
  Link, AtSign, Sparkles, FileText, Users, Target, Calendar, BookOpen } from 'lucide-react';
import { BlockProperties, BlockType } from '../../types';
import { SLASH_COMMANDS, SlashCommand } from './slashCommands';
import { employeeName } from './EmployeePicker';
import { readSlashHistory, recordSlashCommand } from '../../utils/slashHistory';
import { SlashCommandPreview } from './SlashCommandPreview';

type MenuItem = SlashCommand & { sourceId?: string };

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType, properties?: BlockProperties) => void;
  onClose: () => void;
  onSelectTemplate?: (templateId: string) => void;
  onApplyColor?: (color: string, isBackground: boolean) => void;
  mentions?: NonNullable<BlockProperties['mention']>[];
  position?: { top: number; left: number; lineTop?: number };
}

export const normalizeCommandQuery = (value: string) => value.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

function matchCommand(item: SlashCommand, query: string): number {
  if (!query) return 0;
  const title = normalizeCommandQuery(item.title);
  const type = normalizeCommandQuery(item.type);
  const words = title.split(/\s+/);
  const haystack = normalizeCommandQuery([item.title, item.subtitle, item.shortcut, item.type, item.category,
    item.properties?.provider, item.properties?.mention?.emails.join(' ')].join(' '));
  if (query === 'ai' && !haystack.split(/\s+/).includes('ai')) return -1;
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (words.some(word => word.startsWith(query))) return 2;
  if (title.includes(query)) return 3;
  if (type.startsWith(query)) return 4;
  return query.split(/\s+/).every(word => haystack.split(/\s+/).some(token => token.startsWith(word))) ? 5 : -1;
}

const icons: Partial<Record<BlockType, typeof Type>> = {
  paragraph: Type, h1: Heading1, h2: Heading2, h3: Heading3, h4: Heading4,
  bullet: List, numbered: ListOrdered, checklist: CheckSquare,
  table: Table, callout: Lightbulb,
  image: Image, video: Video, audio: Music, file: File, link: Link,
  meeting_info: Sparkles,
};

export const SlashMenu: React.FC<SlashMenuProps> = ({ query, onSelect, onClose, onSelectTemplate, onApplyColor, mentions = [], position }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState(readSlashHistory);
  const [layout, setLayout] = useState({ top: 56, left: 16, maxHeight: 360 });
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewLayout, setPreviewLayout] = useState<{ top: number; left: number; width: number } | null>(null);
  const mentionsOnly = query.startsWith('@');
  const cleanQuery = normalizeCommandQuery(mentionsOnly ? query.slice(1) : query);
  const mentionedCommands = new Map<string, SlashCommand>();
  for (const mention of mentions) {
    const entries = mention.kind === 'group' ? [mention] : mention.emails.map(email => ({
      ...mention, emails: [email], permission: mention.permissions?.[email] || mention.permission,
      permissions: { [email]: mention.permissions?.[email] || mention.permission },
    }));
    for (const entry of entries) {
      const key = `${entry.kind}:${entry.groupName || entry.emails[0]}`;
      mentionedCommands.set(key, {
        id: `mention-${encodeURIComponent(key)}`, type: 'utility', category: 'Nội tuyến',
        title: entry.groupName || employeeName(entry.emails[0]),
        properties: { mention: { ...entry, scope: 'page' }, utilityKind: entry.kind === 'group' ? 'Nhắc đến một nhóm' : 'Nhắc đến một người' },
      });
    }
  }
  const commands = SLASH_COMMANDS.flatMap(item => item.id === 'command_57' ? [...mentionedCommands.values(), item] : [item]);
  const recentItems: MenuItem[] = recentIds.flatMap(id => {
    const item = commands.find(command => command.id === id && !command.disabled);
    return item ? [{ ...item, id: `recent-${id}`, sourceId: id, category: 'Được đề xuất' }] : [];
  });
  const showRecent = !cleanQuery && !mentionsOnly;
  const filteredItems: MenuItem[] = (showRecent ? [...commands.filter(item => item.category === 'Được đề xuất'), ...recentItems, ...commands.filter(item => item.category !== 'Được đề xuất')] : commands)
    .filter(item => !mentionsOnly || item.category === 'Nội tuyến')
    .map(item => ({ item, rank: matchCommand(item, cleanQuery) }))
    .filter(result => result.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(result => result.item);
  const categories = [...new Set(filteredItems.map(item => item.category))];
  const selectableItems = filteredItems.filter(item => !item.disabled);
  const previewItem = selectableItems.find(item => item.id === hoveredItemId);

  useLayoutEffect(() => {
    if (!previewItem) { setPreviewLayout(null); return; }
    const update = () => {
      const menu = containerRef.current;
      if (!menu) return;
      const rect = menu.getBoundingClientRect();
      const leftEdge = rect.width ? rect.left : layout.left;
      const rightEdge = rect.width ? rect.right : layout.left + Math.min(384, window.innerWidth - 24);
      const rightSpace = window.innerWidth - rightEdge - 24;
      const leftSpace = leftEdge - 24;
      const onRight = rightSpace >= 240 || rightSpace >= leftSpace;
      const width = Math.min(280, onRight ? rightSpace : leftSpace);
      if (width < 200) { setPreviewLayout(null); return; }
      const selected = menu.querySelector<HTMLElement>('[aria-selected="true"]');
      const itemRect = selected?.getBoundingClientRect();
      const anchorCenter = itemRect && itemRect.height ? itemRect.top + itemRect.height / 2 : layout.top;
      const height = previewRef.current?.getBoundingClientRect().height || 300;
      setPreviewLayout({ left: onRight ? rightEdge + 12 : leftEdge - width - 12, top: Math.max(12, Math.min(anchorCenter - height / 2, window.innerHeight - height - 12)), width });
    };
    update();
    window.addEventListener('resize', update);
    const list = containerRef.current?.querySelector('[role="listbox"]');
    list?.addEventListener('scroll', update);
    return () => { window.removeEventListener('resize', update); list?.removeEventListener('scroll', update); };
  }, [previewItem?.id, layout.top, layout.left, layout.maxHeight, previewLayout !== null]);

  const selectItem = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.templateId && !onSelectTemplate) return;
    if (item.color && !onApplyColor) return;
    setRecentIds(recordSlashCommand(item.sourceId || item.id));
    if (item.templateId) onSelectTemplate?.(item.templateId);
    else if (item.color) onApplyColor?.(item.color.value, item.color.target === 'backgroundColor');
    else onSelect(item.type, item.properties);
  };

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useLayoutEffect(() => {
    const placeMenu = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 12;
      const preferredMaxH = Math.max(120, Math.min(440, Math.round(vh * 0.58), vh - pad * 2));
      const listEl = containerRef.current?.querySelector<HTMLElement>('[role="listbox"]');
      const footerEl = containerRef.current?.lastElementChild as HTMLElement | null;
      const listScrollH = listEl?.scrollHeight || 0;
      const naturalH = listScrollH > 0 ? listScrollH + (footerEl?.offsetHeight || 34) + 6 : preferredMaxH;
      const anchorBelow = position?.top ?? 160;
      const anchorAbove = position?.lineTop != null ? position.lineTop - 6 : anchorBelow - 32;

      const spaceBelow = Math.max(0, vh - anchorBelow - pad);
      const spaceAbove = Math.max(0, anchorAbove - pad);
      const minComfortH = Math.min(280, naturalH);
      const openAbove = spaceBelow < minComfortH && spaceAbove > spaceBelow;

      const availableSpace = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(96, Math.min(preferredMaxH, availableSpace));
      const renderedHeight = Math.min(naturalH, maxHeight);
      const rawTop = openAbove ? anchorAbove - renderedHeight : anchorBelow;
      const top = Math.max(pad, Math.min(rawTop, vh - renderedHeight - pad));

      const menuWidth = containerRef.current?.offsetWidth || Math.min(384, vw - pad * 2);
      const left = Math.max(pad, Math.min(position?.left ?? 320, vw - menuWidth - pad));
      setLayout({ top, left, maxHeight });
    };
    placeMenu();
    window.addEventListener('resize', placeMenu);
    return () => window.removeEventListener('resize', placeMenu);
  }, [position?.top, position?.left, position?.lineTop, query, filteredItems.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') { onClose(); return; }
      if (!selectableItems.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = (selectedIndex + direction + selectableItems.length) % selectableItems.length;
        setSelectedIndex(nextIndex);
        setHoveredItemId(selectableItems[nextIndex].id);
      }
      if (event.key === 'Enter') {
        const item = selectableItems[Math.min(selectedIndex, selectableItems.length - 1)];
        selectItem(item);
      }
    };
    // Capture before the textarea handles Enter and inserts an unwanted block.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectableItems, selectedIndex, onSelect, onSelectTemplate, onClose, onApplyColor]);

  useEffect(() => {
    containerRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, query]);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node) && !previewRef.current?.contains(event.target as Node)) onClose();
    };
    const handleScroll = (event: Event) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target) && !previewRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const renderItem = (item: MenuItem) => {
    const index = selectableItems.indexOf(item);
    const templateIcons: Record<string, typeof Type> = { tpl_personal_note: FileText, tpl_meeting_minutes: Users, tpl_work_plan: Target, tpl_weekly_plan: Calendar, tpl_internal_doc: BookOpen };
    const Icon = item.templateId ? templateIcons[item.templateId] || FileText : item.category === 'Nội tuyến' || item.properties?.mention || item.properties?.utilityKind?.startsWith('Nhắc đến') ? AtSign : icons[item.type] || Type;
    return <button key={item.id} type="button" role="option" aria-selected={index === selectedIndex}
      id={`slash-${item.id}`} tabIndex={-1} aria-label={item.title} data-slash-command-title={item.title} aria-keyshortcuts={item.shortcut} disabled={item.disabled} aria-disabled={!!item.disabled}
      onMouseDown={event => event.preventDefault()} onClick={() => selectItem(item)}
      onMouseMove={() => { if (!item.disabled) { setHoveredItemId(item.id); if (index !== selectedIndex) setSelectedIndex(index); } }}
      onMouseLeave={() => setHoveredItemId(null)}
      className={`w-full min-h-14 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${item.disabled
        ? 'opacity-50 cursor-not-allowed'
        : `cursor-pointer ${index === selectedIndex ? 'bg-[var(--ui-hover)] ring-1 ring-inset ring-[var(--ui-accent)]' : 'hover:bg-[var(--ui-hover)]'}`}`}>
      {item.color ? <span aria-hidden="true" className="w-5 h-5 shrink-0 rounded-md border flex items-center justify-center text-xs"
        style={{
          color: item.color.target === 'textColor' ? item.color.value || 'var(--ui-text)' : undefined,
          backgroundColor: item.color.target === 'backgroundColor' ? item.color.swatch || item.color.value || 'transparent' : undefined,
          borderColor: item.color.border || item.color.value || 'var(--ui-border)',
        }}>{item.color.target === 'textColor' ? 'A' : ''}</span>
        : <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--ui-hover)]"><Icon className="h-5 w-5 text-[var(--ui-muted)]" strokeWidth={1.6} /></span>}
      <span className="flex-1 min-w-0 leading-5"><span className="block text-sm font-medium">{item.title}</span>
        {item.subtitle && <span className="mt-0.5 block text-[11px] leading-4 text-[var(--ui-muted)]">{item.subtitle}</span>}</span>
      {item.badge && <span className="text-[11px] px-1.5 rounded-full bg-[#EBF5FF] text-[var(--ui-accent)] shrink-0">{item.badge}</span>}
      {item.shortcut && <kbd className="shrink-0 whitespace-nowrap rounded-full bg-[var(--ui-hover)] px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">{item.shortcut}</kbd>}
    </button>;
  };

  return createPortal(<><div ref={containerRef} role="dialog" aria-label="Chèn tiện ích nhanh"
    className="fixed z-50 w-[384px] max-w-[calc(100vw-24px)] flex flex-col bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-2xl overflow-hidden"
    style={{ top: layout.top, left: layout.left, maxHeight: layout.maxHeight }}>
    <div role="listbox" aria-label="Tiện ích nhanh" aria-activedescendant={selectableItems[selectedIndex] ? `slash-${selectableItems[selectedIndex].id}` : undefined}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
      {!filteredItems.length ? <p className="px-3 py-4 text-sm text-[var(--ui-tertiary)]">Không tìm thấy thành phần nào</p> :
        cleanQuery ? <><p className="px-2 py-2 text-xs text-[var(--ui-tertiary)]">Kết quả đã lọc ({filteredItems.length})</p>{filteredItems.map(renderItem)}</> :
          categories.map(category => <div key={category} role="group" aria-label={category}
            className={`mb-2 ${category === 'Màu chữ' || category === 'Màu nền' ? 'border-t border-[var(--ui-border)] pt-1' : ''}`}>
            <p className="px-2 pt-2 pb-1 text-xs text-[var(--ui-tertiary)]">{category}</p>
            {filteredItems.filter(item => item.category === category).map(renderItem)}</div>)}
    </div>
    <button type="button" onClick={onClose} className="shrink-0 flex items-center justify-between border-t border-[var(--ui-border)] px-3 py-2 text-xs bg-[var(--ui-surface)] cursor-pointer">
      <span>Đóng menu</span><span className="text-[var(--ui-tertiary)]">esc</span></button>
  </div>
  {previewItem && previewLayout && <div ref={previewRef} role="region" aria-label={`Xem trước ${previewItem.title}`}
    data-slash-preview={previewItem.templateId || previewItem.type} style={previewLayout}
    className="fixed z-50 flex max-h-[calc(100dvh-24px)] flex-col rounded-lg bg-[#262626] p-2 shadow-xl [&>[data-command-preview-content]]:max-h-64">
    <SlashCommandPreview command={previewItem} />
  </div>}</>, document.body);
};
