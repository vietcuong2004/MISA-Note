import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  List,
  Database,
  PenTool,
  LayoutGrid,
} from 'lucide-react';
import { BlockType } from '../../types';

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

interface CategoryDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: {
    type: BlockType;
    glyph: string | React.ReactNode;
    title: string;
    description: string;
  }[];
}

const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'text',
    name: 'Văn bản',
    icon: <FileText className="w-3.5 h-3.5 stroke-[1.75]" />,
    items: [
      {
        type: 'paragraph',
        glyph: 'π',
        title: 'Văn bản',
        description: 'Nhập đoạn văn bản',
      },
      {
        type: 'h1',
        glyph: 'H₁',
        title: 'Tiêu đề 1',
        description: 'Tiêu đề lớn',
      },
      {
        type: 'h2',
        glyph: 'H₂',
        title: 'Tiêu đề 2',
        description: 'Tiêu đề vừa',
      },
      {
        type: 'quote',
        glyph: '❝',
        title: 'Trích dẫn',
        description: 'Khối trích dẫn',
      },
    ],
  },
  {
    id: 'list',
    name: 'Danh sách',
    icon: <List className="w-3.5 h-3.5 stroke-[1.75]" />,
    items: [
      {
        type: 'bullet',
        glyph: '•',
        title: 'Dấu chấm',
        description: 'Danh sách gạch đầu dòng',
      },
      {
        type: 'numbered',
        glyph: '1.',
        title: 'Đánh số',
        description: 'Danh sách thứ tự',
      },
      {
        type: 'checklist',
        glyph: '☑',
        title: 'Việc cần làm',
        description: 'Checklist ô kiểm',
      },
      {
        type: 'toggle',
        glyph: '▶',
        title: 'Thu gọn',
        description: 'Khối danh sách đóng mở',
      },
    ],
  },
  {
    id: 'data',
    name: 'Dữ liệu',
    icon: <Database className="w-3.5 h-3.5 stroke-[1.75]" />,
    items: [
      {
        type: 'table',
        glyph: '▦',
        title: 'Bảng dữ liệu',
        description: 'Bảng dòng và cột',
      },
      {
        type: 'meeting_info',
        glyph: '📅',
        title: 'Thông tin họp',
        description: 'Thời gian, địa điểm họp',
      },
      {
        type: 'meeting_attendees',
        glyph: '👥',
        title: 'Người tham dự',
        description: 'Danh sách thành viên',
      },
      {
        type: 'meeting_action_items',
        glyph: '✓',
        title: 'Action items',
        description: 'Đầu việc sau cuộc họp',
      },
    ],
  },
  {
    id: 'insert',
    name: 'Chèn',
    icon: <PenTool className="w-3.5 h-3.5 stroke-[1.75]" />,
    items: [
      {
        type: 'image',
        glyph: '🖼',
        title: 'Hình ảnh',
        description: 'Chèn ảnh minh họa',
      },
      {
        type: 'file',
        glyph: '📎',
        title: 'Tệp đính kèm',
        description: 'Đính kèm tệp tài liệu',
      },
      {
        type: 'link',
        glyph: '🔗',
        title: 'Liên kết web',
        description: 'Đường dẫn liên kết',
      },
      {
        type: 'code',
        glyph: '</>',
        title: 'Mã nguồn',
        description: 'Khối code định dạng',
      },
    ],
  },
  {
    id: 'layout',
    name: 'Bố cục',
    icon: <LayoutGrid className="w-3.5 h-3.5 stroke-[1.75]" />,
    items: [
      {
        type: 'callout',
        glyph: '💡',
        title: 'Khối chú thích',
        description: 'Hộp thông tin nổi bật',
      },
      {
        type: 'divider',
        glyph: '—',
        title: 'Đường phân cách',
        description: 'Kẻ ngang chia đoạn',
      },
      {
        type: 'h3',
        glyph: 'H₃',
        title: 'Tiêu đề 3',
        description: 'Tiêu đề phụ nhỏ',
      },
      {
        type: 'meeting_agenda',
        glyph: '⏱',
        title: 'Chương trình họp',
        description: 'Nội dung và thời lượng',
      },
    ],
  },
];

export const SlashMenu: React.FC<SlashMenuProps> = ({
  query,
  onSelect,
  onClose,
  position,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('text');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.toLowerCase().trim();

  // If query is typed, search across all categories
  const isSearching = cleanQuery.length > 0;
  const allItems = CATEGORIES.flatMap((c) => c.items);
  const filteredSearchItems = isSearching
    ? allItems.filter(
        (i) =>
          i.title.toLowerCase().includes(cleanQuery) ||
          i.description.toLowerCase().includes(cleanQuery) ||
          i.type.toLowerCase().includes(cleanQuery)
      )
    : [];

  const activeCategory =
    CATEGORIES.find((c) => c.id === activeCategoryId) || CATEGORIES[0];
  const currentItems = isSearching ? filteredSearchItems : activeCategory.items;

  useEffect(() => {
    setSelectedItemIndex(0);
  }, [activeCategoryId, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedItemIndex((prev) => (prev + 1) % currentItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedItemIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentItems[selectedItemIndex]) {
          onSelect(currentItems[selectedItemIndex].type);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && !isSearching) {
        // move to next category
        const catIdx = CATEGORIES.findIndex((c) => c.id === activeCategoryId);
        if (catIdx < CATEGORIES.length - 1) {
          setActiveCategoryId(CATEGORIES[catIdx + 1].id);
        }
      } else if (e.key === 'ArrowLeft' && !isSearching) {
        // move to prev category
        const catIdx = CATEGORIES.findIndex((c) => c.id === activeCategoryId);
        if (catIdx > 0) {
          setActiveCategoryId(CATEGORIES[catIdx - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItems, selectedItemIndex, activeCategoryId, isSearching, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white/95 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={
        position
          ? {
              top: `${position.top}px`,
              left: `${Math.min(position.left, window.innerWidth - 440)}px`,
              width: '420px',
            }
          : { top: '100%', left: 0, width: '420px' }
      }
    >
      <div className="flex divide-x divide-[#E5E5EA]">
        {/* Left Column: Categories exactly matching screenshot */}
        {!isSearching && (
          <div className="w-[124px] p-2 space-y-1 bg-[#FAFAFA] shrink-0">
            {CATEGORIES.map((cat) => {
              const isActive = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  onMouseEnter={() => setActiveCategoryId(cat.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#EAEAEC] text-[#1D1D1F] font-semibold'
                      : 'text-[#48484A] hover:bg-[#F2F2F7]'
                  }`}
                >
                  <span className="shrink-0 text-[#1D1D1F]">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Right Column: Items */}
        <div className="flex-1 p-2 flex flex-col justify-start min-h-[190px]">
          <div className="px-3 pt-1 pb-1.5 text-xs font-semibold text-[#1D1D1F]">
            {isSearching ? `Kết quả tìm kiếm ("${query}")` : activeCategory.name}
          </div>

          {currentItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#86868B]">
              Không tìm thấy tiện ích
            </div>
          ) : (
            <div className="space-y-0.5">
              {currentItems.map((item, idx) => {
                const isSelected = idx === selectedItemIndex;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onSelect(item.type)}
                    onMouseEnter={() => setSelectedItemIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F2F2F7] text-[#1D1D1F]'
                        : 'text-[#1D1D1F] hover:bg-[#F2F2F7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-center font-bold text-xs text-[#1D1D1F] shrink-0 font-sans">
                        {item.glyph}
                      </span>
                      <span className="text-xs font-semibold text-[#1D1D1F] truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-xs text-[#86868B] truncate ml-3 pl-1 font-normal">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
