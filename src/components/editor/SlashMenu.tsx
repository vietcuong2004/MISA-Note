import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Type, Heading1, Heading2, Heading3, Heading4, List, ListOrdered, CheckSquare,
  ChevronRight, Quote, Table, Minus, Lightbulb, Image, Video, Music, File,
  Link, Code, Globe, Database, Layers, AtSign, Download, Sparkles } from 'lucide-react';
import { BlockProperties, BlockType } from '../../types';
import { SLASH_COMMANDS, SlashCommand } from './slashCommands';

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType, properties?: BlockProperties) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const normalizeCommandQuery = (value: string) => value.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

const icons: Partial<Record<BlockType, typeof Type>> = {
  paragraph: Type, h1: Heading1, h2: Heading2, h3: Heading3, h4: Heading4,
  bullet: List, numbered: ListOrdered, checklist: CheckSquare, toggle: ChevronRight,
  quote: Quote, table: Table, divider: Minus, callout: Lightbulb,
  image: Image, video: Video, audio: Music, file: File, link: Link,
  code: Code, embed: Globe, meeting_info: Sparkles,
};

export const SlashMenu: React.FC<SlashMenuProps> = ({ query, onSelect, onClose, position }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [layout, setLayout] = useState({ top: 56, left: 16, maxHeight: 360 });
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanQuery = normalizeCommandQuery(query);
  const filteredItems = SLASH_COMMANDS.filter(item => !cleanQuery ||
    normalizeCommandQuery([item.title, item.subtitle, item.shortcut, item.type, item.category,
      item.properties?.provider].join(' ')).includes(cleanQuery));
  const categories = [...new Set(filteredItems.map(item => item.category))];

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
      if (!filteredItems.length) return;
      if (event.key === 'ArrowDown') setSelectedIndex(index => (index + 1) % filteredItems.length);
      if (event.key === 'ArrowUp') setSelectedIndex(index => (index - 1 + filteredItems.length) % filteredItems.length);
      if (event.key === 'Enter') {
        const item = filteredItems[Math.min(selectedIndex, filteredItems.length - 1)];
        onSelect(item.type, item.properties);
      }
    };
    // Capture before the textarea handles Enter and inserts an unwanted block.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

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

  const renderItem = (item: SlashCommand) => {
    const index = filteredItems.indexOf(item);
    const Icon = icons[item.type] || (item.properties?.utilityKind === 'import' ? Download :
      item.properties?.utilityKind === 'database' ? Database : item.category === 'Nội tuyến' ? AtSign : Layers);
    return <button key={item.id} type="button" role="option" aria-selected={index === selectedIndex}
      id={`slash-${item.id}`} tabIndex={-1} title={item.title}
      onMouseDown={event => event.preventDefault()} onClick={() => onSelect(item.type, item.properties)}
      onMouseEnter={() => setSelectedIndex(index)}
      className={`w-full min-h-8 flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm cursor-pointer ${
        index === selectedIndex ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'}`}>
      <Icon className="w-5 h-5 shrink-0 text-[var(--ui-muted)]" strokeWidth={1.6} />
      <span className="flex-1 min-w-0 leading-5">{item.title}
        {item.subtitle && <span className="text-[var(--ui-tertiary)]"> · {item.subtitle}</span>}</span>
      {item.badge && <span className="text-[11px] px-1.5 rounded bg-[#EBF5FF] text-[var(--ui-accent)] shrink-0">{item.badge}</span>}
      {item.shortcut && <span className="text-xs text-[var(--ui-tertiary)] shrink-0">{item.shortcut}</span>}
    </button>;
  };

  return createPortal(<div ref={containerRef} role="dialog" aria-label="Chèn tiện ích nhanh"
    className="fixed z-50 w-[324px] max-w-[calc(100vw-24px)] flex flex-col bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-2xl overflow-hidden"
    style={{ top: layout.top, left: layout.left, maxHeight: layout.maxHeight }}>
    <div role="listbox" aria-label="Tiện ích nhanh" aria-activedescendant={filteredItems[selectedIndex] ? `slash-${filteredItems[selectedIndex].id}` : undefined}
      className="min-h-0 overflow-y-auto overscroll-contain p-1.5">
      {!filteredItems.length ? <p className="px-3 py-4 text-sm text-[var(--ui-tertiary)]">Không tìm thấy thành phần nào</p> :
        cleanQuery ? <><p className="px-2 py-2 text-xs text-[var(--ui-tertiary)]">Kết quả tìm kiếm ({filteredItems.length})</p>{filteredItems.map(renderItem)}</> :
          categories.map(category => <div key={category} role="group" aria-label={category} className="mb-2">
            <p className="px-2 pt-2 pb-1 text-xs text-[var(--ui-tertiary)]">{category}</p>
            {filteredItems.filter(item => item.category === category).map(renderItem)}</div>)}
    </div>
    <button type="button" onClick={onClose} className="shrink-0 flex items-center justify-between border-t border-[var(--ui-border)] px-3 py-2 text-xs bg-[var(--ui-surface)] cursor-pointer">
      <span>Đóng menu</span><span className="text-[var(--ui-tertiary)]">esc</span></button>
  </div>, document.body);
};
