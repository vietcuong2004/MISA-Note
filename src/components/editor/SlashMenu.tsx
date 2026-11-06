import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table,
  Minus,
  Lightbulb,
} from 'lucide-react';
import { BlockType } from '../../types';

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

interface MenuItem {
  id: string;
  type: BlockType;
  glyph: React.ReactNode;
  title: string;
  subtitle?: string;
  shortcut?: string;
  badge?: string;
  category: 'suggested' | 'basic';
}

const MENU_ITEMS: MenuItem[] = [
  // 1. Được đề xuất
  {
    id: 'ai_meeting',
    type: 'meeting_info',
    glyph: <Sparkles className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Ghi chép cuộc họp với AI',
    category: 'suggested',
  },
  {
    id: 'embed_html',
    type: 'code',
    glyph: <Code className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'HTML',
    subtitle: '· Nhúng',
    badge: 'Mới',
    category: 'suggested',
  },

  // 2. Thành phần nội dung cơ bản
  {
    id: 'paragraph',
    type: 'paragraph',
    glyph: <span className="font-serif font-bold text-xs">T</span>,
    title: 'Văn bản',
    category: 'basic',
  },
  {
    id: 'h1',
    type: 'h1',
    glyph: <span className="font-sans font-bold text-xs">H₁</span>,
    title: 'Đề mục 1',
    shortcut: '#',
    category: 'basic',
  },
  {
    id: 'h2',
    type: 'h2',
    glyph: <span className="font-sans font-bold text-xs">H₂</span>,
    title: 'Đề mục 2',
    shortcut: '##',
    category: 'basic',
  },
  {
    id: 'h3',
    type: 'h3',
    glyph: <span className="font-sans font-bold text-xs">H₃</span>,
    title: 'Đề mục 3',
    shortcut: '###',
    category: 'basic',
  },
  {
    id: 'h4',
    type: 'h3',
    glyph: <span className="font-sans font-bold text-xs">H₄</span>,
    title: 'Đề mục 4',
    shortcut: '####',
    category: 'basic',
  },
  {
    id: 'bullet',
    type: 'bullet',
    glyph: <List className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Danh sách có dấu đầu dòng',
    category: 'basic',
  },
  {
    id: 'numbered',
    type: 'numbered',
    glyph: <ListOrdered className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Danh sách được đánh số',
    category: 'basic',
  },
  {
    id: 'checklist',
    type: 'checklist',
    glyph: <CheckSquare className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Danh sách việc cần làm',
    category: 'basic',
  },
  {
    id: 'quote',
    type: 'quote',
    glyph: <Quote className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Trích dẫn',
    category: 'basic',
  },
  {
    id: 'table',
    type: 'table',
    glyph: <Table className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Bảng',
    category: 'basic',
  },
  {
    id: 'code',
    type: 'code',
    glyph: <Code className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Khối mã',
    category: 'basic',
  },
  {
    id: 'divider',
    type: 'divider',
    glyph: <Minus className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Đường phân cách',
    category: 'basic',
  },
  {
    id: 'callout',
    type: 'callout',
    glyph: <Lightbulb className="w-3.5 h-3.5 stroke-[1.75]" />,
    title: 'Khối chú thích',
    category: 'basic',
  },
];

export const SlashMenu: React.FC<SlashMenuProps> = ({
  query,
  onSelect,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.toLowerCase().trim();

  // Filter items matching query
  const filteredItems = cleanQuery
    ? MENU_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(cleanQuery) ||
          item.subtitle?.toLowerCase().includes(cleanQuery) ||
          item.shortcut?.toLowerCase().includes(cleanQuery) ||
          item.type.toLowerCase().includes(cleanQuery)
      )
    : MENU_ITEMS;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredItems.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Group filtered items by category if no active search, else show as flat list
  const suggestedItems = filteredItems.filter((i) => i.category === 'suggested');
  const basicItems = filteredItems.filter((i) => i.category === 'basic');

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col w-[285px]"
      style={{
        top: position ? `${Math.min(position.top, window.innerHeight - 380)}px` : '160px',
        left: position ? `${Math.max(16, Math.min(position.left, window.innerWidth - 305))}px` : '320px',
      }}
    >
      {/* Scrollable Items Container matching Image 3 */}
      <div
        ref={scrollRef}
        className="max-h-[320px] overflow-y-auto p-1.5 space-y-2 select-none"
      >
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#86868B]">
            Không tìm thấy thành phần nào
          </div>
        ) : cleanQuery ? (
          // Flat list when searching
          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-[#86868B]">
              Kết quả tìm kiếm ({filteredItems.length})
            </div>
            {filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => onSelect(item.type)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-[#F2F2F7] text-[#1D1D1F]'
                      : 'text-[#1D1D1F] hover:bg-[#F2F2F7]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center font-bold text-xs text-[#1D1D1F] shrink-0">
                      {item.glyph}
                    </span>
                    <span className="font-medium text-[#1D1D1F] truncate">
                      {item.title}
                      {item.subtitle && (
                        <span className="text-[#86868B] font-normal ml-1">
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#EBF5FF] text-[#0071E3] shrink-0">
                      {item.badge}
                    </span>
                  )}
                  {item.shortcut && (
                    <span className="font-mono text-xs text-[#AEAEB2] shrink-0 ml-2">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          // Grouped by section matching Image 3
          <>
            {/* Section 1: Được đề xuất */}
            {suggestedItems.length > 0 && (
              <div className="space-y-0.5">
                <div className="px-2.5 pt-1 pb-1 text-[11px] font-normal text-[#86868B]">
                  Được đề xuất
                </div>
                {suggestedItems.map((item) => {
                  const itemIndex = filteredItems.findIndex((i) => i.id === item.id);
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => onSelect(item.type)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-[#F2F2F7] text-[#1D1D1F]'
                          : 'text-[#1D1D1F] hover:bg-[#F2F2F7]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-bold text-xs text-[#1D1D1F] shrink-0 flex items-center justify-center">
                          {item.glyph}
                        </span>
                        <span className="font-medium text-[#1D1D1F] truncate">
                          {item.title}
                          {item.subtitle && (
                            <span className="text-[#86868B] font-normal ml-1">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#EBF5FF] text-[#0071E3] shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 2: Thành phần nội dung cơ bản */}
            {basicItems.length > 0 && (
              <div className="space-y-0.5 pt-1">
                <div className="px-2.5 pt-1 pb-1 text-[11px] font-normal text-[#86868B]">
                  Thành phần nội dung cơ bản
                </div>
                {basicItems.map((item) => {
                  const itemIndex = filteredItems.findIndex((i) => i.id === item.id);
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => onSelect(item.type)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-[#F2F2F7] text-[#1D1D1F]'
                          : 'text-[#1D1D1F] hover:bg-[#F2F2F7]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-bold text-xs text-[#1D1D1F] shrink-0 flex items-center justify-center">
                          {item.glyph}
                        </span>
                        <span className="font-medium text-[#1D1D1F] truncate">
                          {item.title}
                        </span>
                      </div>
                      {item.shortcut && (
                        <span className="font-mono text-xs text-[#AEAEB2] shrink-0 ml-2">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer bar matching Image 3 */}
      <div className="px-3 py-2 border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#1D1D1F] bg-white shrink-0">
        <span className="text-[11px] font-normal">Đóng menu</span>
        <span className="font-mono text-[10px] text-[#86868B]">esc</span>
      </div>
    </div>
  );
};
