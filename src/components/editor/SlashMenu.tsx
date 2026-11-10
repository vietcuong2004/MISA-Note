import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Type, Heading1, Heading2, Heading3, Heading4, List, ListOrdered, CheckSquare,
  Table, Lightbulb, Image, Video, Music, File,
  Link, AtSign, Sparkles } from 'lucide-react';
import { BlockProperties, BlockType } from '../../types';
import { SLASH_COMMANDS, SlashCommand } from './slashCommands';
import { employeeName } from './EmployeePicker';
import { readSlashHistory, recordSlashCommand } from '../../utils/slashHistory';

type MenuItem = SlashCommand & { sourceId?: string };

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType, properties?: BlockProperties) => void;
  onClose: () => void;
  onApplyColor?: (color: string, isBackground: boolean) => void;
  mentions?: NonNullable<BlockProperties['mention']>[];
  position?: { top: number; left: number };
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
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (words.some(word => word.startsWith(query))) return 2;
  if (title.includes(query)) return 3;
  if (type.startsWith(query)) return 4;
  return query.split(/\s+/).every(word => haystack.includes(word)) ? 5 : -1;
}

const icons: Partial<Record<BlockType, typeof Type>> = {
  paragraph: Type, h1: Heading1, h2: Heading2, h3: Heading3, h4: Heading4,
  bullet: List, numbered: ListOrdered, checklist: CheckSquare,
  table: Table, callout: Lightbulb,
  image: Image, video: Video, audio: Music, file: File, link: Link,
  meeting_info: Sparkles,
};

export const SlashMenu: React.FC<SlashMenuProps> = ({ query, onSelect, onClose, onApplyColor, mentions = [], position }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState(readSlashHistory);
  const [layout, setLayout] = useState({ top: 56, left: 16, maxHeight: 360 });
  const containerRef = useRef<HTMLDivElement>(null);
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
  const filteredItems: MenuItem[] = (showRecent ? [...recentItems, ...commands] : commands)
    .filter(item => !mentionsOnly || item.category === 'Nội tuyến')
    .map(item => ({ item, rank: matchCommand(item, cleanQuery) }))
    .filter(result => result.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(result => result.item);
  const categories = [...new Set(filteredItems.map(item => item.category))];
  const selectableItems = filteredItems.filter(item => !item.disabled);

  const selectItem = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.color && !onApplyColor) return;
    setRecentIds(recordSlashCommand(item.sourceId || item.id));
    if (item.color) onApplyColor?.(item.color.value, item.color.target === 'backgroundColor');
    else onSelect(item.type, item.properties);
  };

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useLayoutEffect(() => {
    const placeMenu = () => {
      const maxHeight = Math.max(64, Math.min(448, window.innerHeight * 0.4, window.innerHeight - 68));
      const height = Math.min(containerRef.current?.scrollHeight || maxHeight, maxHeight);
      const anchorTop = position?.top ?? 160;
      const top = window.innerHeight - anchorTop - 12 >= height ? anchorTop : anchorTop - height - 32;
      setLayout({ top: Math.max(56, Math.min(top, window.innerHeight - height - 12)),
        left: Math.max(12, Math.min(position?.left ?? 320, window.innerWidth - 336)), maxHeight });
    };
    placeMenu();
    window.addEventListener('resize', placeMenu);
    return () => window.removeEventListener('resize', placeMenu);
  }, [position?.top, position?.left, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') { onClose(); return; }
      if (!selectableItems.length) return;
      if (event.key === 'ArrowDown') setSelectedIndex(index => (index + 1) % selectableItems.length);
      if (event.key === 'ArrowUp') setSelectedIndex(index => (index - 1 + selectableItems.length) % selectableItems.length);
      if (event.key === 'Enter') {
        const item = selectableItems[Math.min(selectedIndex, selectableItems.length - 1)];
        selectItem(item);
      }
    };
    // Capture before the textarea handles Enter and inserts an unwanted block.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectableItems, selectedIndex, onSelect, onClose, onApplyColor]);

  useEffect(() => {
    containerRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, query]);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    const handleScroll = (event: Event) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) onClose();
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
    const Icon = item.category === 'Nội tuyến' || item.properties?.mention || item.properties?.utilityKind?.startsWith('Nhắc đến') ? AtSign : icons[item.type] || Type;
    return <button key={item.id} type="button" role="option" aria-selected={index === selectedIndex}
      id={`slash-${item.id}`} tabIndex={-1} title={item.title} disabled={item.disabled} aria-disabled={!!item.disabled}
      onMouseDown={event => event.preventDefault()} onClick={() => selectItem(item)}
      onMouseMove={() => { if (!item.disabled && index !== selectedIndex) setSelectedIndex(index); }}
      className={`w-full min-h-8 flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm ${item.disabled
        ? 'opacity-50 cursor-not-allowed'
        : `cursor-pointer ${index === selectedIndex ? 'bg-[var(--ui-hover)] ring-1 ring-inset ring-[var(--ui-accent)]' : 'hover:bg-[var(--ui-hover)]'}`}`}>
      {item.color ? <span aria-hidden="true" className="w-5 h-5 shrink-0 rounded-md border flex items-center justify-center text-xs"
        style={{
          color: item.color.target === 'textColor' ? item.color.value || 'var(--ui-text)' : undefined,
          backgroundColor: item.color.target === 'backgroundColor' ? item.color.value || 'transparent' : undefined,
          borderColor: item.color.value || 'var(--ui-border)',
        }}>{item.color.target === 'textColor' ? 'A' : ''}</span>
        : <Icon className="w-5 h-5 shrink-0 text-[var(--ui-muted)]" strokeWidth={1.6} />}
      <span className="flex-1 min-w-0 leading-5">{item.title}
        {item.subtitle && <span className="text-[var(--ui-tertiary)]"> · {item.subtitle}</span>}</span>
      {item.badge && <span className="text-[11px] px-1.5 rounded-full bg-[#EBF5FF] text-[var(--ui-accent)] shrink-0">{item.badge}</span>}
      {item.shortcut && <span className="text-xs text-[var(--ui-tertiary)] shrink-0">{item.shortcut}</span>}
    </button>;
  };

  return createPortal(<div ref={containerRef} role="dialog" aria-label="Chèn tiện ích nhanh"
    className="fixed z-50 w-[324px] max-w-[calc(100vw-24px)] flex flex-col bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-2xl overflow-hidden"
    style={{ top: layout.top, left: layout.left, maxHeight: layout.maxHeight }}>
    <div role="listbox" aria-label="Tiện ích nhanh" aria-activedescendant={selectableItems[selectedIndex] ? `slash-${selectableItems[selectedIndex].id}` : undefined}
      className="min-h-0 overflow-y-auto overscroll-contain p-1.5">
      {showRecent && !recentItems.length && <div role="group" aria-label="Được đề xuất" className="mb-2">
        <p className="px-2 pt-2 pb-1 text-xs text-[var(--ui-tertiary)]">Được đề xuất</p>
        <p className="px-2 py-1.5 text-xs text-[var(--ui-tertiary)]">Chưa có mục sử dụng gần đây</p>
      </div>}
      {!filteredItems.length ? <p className="px-3 py-4 text-sm text-[var(--ui-tertiary)]">Không tìm thấy thành phần nào</p> :
        cleanQuery ? <><p className="px-2 py-2 text-xs text-[var(--ui-tertiary)]">Kết quả đã lọc ({filteredItems.length})</p>{filteredItems.map(renderItem)}</> :
          categories.map(category => <div key={category} role="group" aria-label={category}
            className={`mb-2 ${category === 'Màu chữ' || category === 'Màu nền' ? 'border-t border-[var(--ui-border)] pt-1' : ''}`}>
            <p className="px-2 pt-2 pb-1 text-xs text-[var(--ui-tertiary)]">{category}</p>
            {filteredItems.filter(item => item.category === category).map(renderItem)}</div>)}
    </div>
    <button type="button" onClick={onClose} className="shrink-0 flex items-center justify-between border-t border-[var(--ui-border)] px-3 py-2 text-xs bg-[var(--ui-surface)] cursor-pointer">
      <span>Đóng menu</span><span className="text-[var(--ui-tertiary)]">esc</span></button>
  </div>, document.body);
};
