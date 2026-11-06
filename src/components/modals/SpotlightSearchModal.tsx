import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Calendar,
  Sparkles,
  CheckSquare,
  Clock,
  ArrowRight,
  X,
  Folder as FolderIcon,
  Tag,
} from 'lucide-react';
import { Document, Folder } from '../../types';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  folders: Folder[];
  onOpenDocument: (docId: string) => void;
  onCreateNewNote: () => void;
  onCreateMeetingNote: () => void;
  onOpenOneAI: () => void;
  onCreateTaskList: () => void;
  onOpenTemplates: () => void;
}

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  documents,
  folders,
  onOpenDocument,
  onCreateNewNote,
  onCreateMeetingNote,
  onOpenOneAI,
  onCreateTaskList,
  onOpenTemplates,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const activeDocs = documents.filter((d) => !d.isTrash);

  const filteredDocs = query.trim()
    ? activeDocs.filter((doc) => {
        const q = query.toLowerCase().trim();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchTag = doc.tags.some((t) => t.toLowerCase().includes(q));
        const matchContent = doc.blocks.some((b) => b.content.toLowerCase().includes(q));
        return matchTitle || matchTag || matchContent;
      })
    : [...activeDocs].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ).slice(0, 6);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredDocs.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredDocs.length) % Math.max(1, filteredDocs.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredDocs[selectedIndex]) {
          onOpenDocument(filteredDocs[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredDocs, selectedIndex, onOpenDocument, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div
        className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5E5EA] gap-3">
          <Search className="w-5 h-5 text-[#86868B] stroke-[1.75] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Tìm kiếm ghi chú, nội dung hoặc tác vụ..."
            className="flex-1 bg-transparent text-sm font-medium text-[#1D1D1F] focus:outline-none placeholder:text-[#86868B]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F2F2F7] text-[#86868B] border border-[#E5E5EA]">
            ESC
          </span>
        </div>

        {/* Quick actions chips */}
        {!query && (
          <div className="p-3 bg-[#F8F8FA] border-b border-[#E5E5EA]">
            <div className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider px-2 mb-2">
              Thao tác nhanh
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onCreateNewNote();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#1D1D1F] text-xs font-medium text-[#1D1D1F] ios-interactive shadow-2xs"
              >
                <FileText className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span className="truncate">Ghi chú mới</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCreateMeetingNote();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#1D1D1F] text-xs font-medium text-[#1D1D1F] ios-interactive shadow-2xs"
              >
                <Calendar className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span className="truncate">Biên bản họp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenOneAI();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#1D1D1F] text-xs font-medium text-[#1D1D1F] ios-interactive shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span className="truncate">Hỏi One AI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCreateTaskList();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#1D1D1F] text-xs font-medium text-[#1D1D1F] ios-interactive shadow-2xs"
              >
                <CheckSquare className="w-4 h-4 text-[#1D1D1F] stroke-[1.75]" />
                <span className="truncate">Công việc</span>
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider px-2 py-1">
            {query ? `Kết quả tìm kiếm (${filteredDocs.length})` : 'Tài liệu gần đây'}
          </div>

          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#86868B]">
              Không tìm thấy ghi chú nào phù hợp với "{query}"
            </div>
          ) : (
            filteredDocs.map((doc, idx) => {
              const folder = folders.find((f) => f.id === doc.folderId);
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onOpenDocument(doc.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#1D1D1F] text-white shadow-2xs' : 'hover:bg-[#F2F2F7] text-[#1D1D1F]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{doc.icon || '📄'}</span>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-[#1D1D1F]'}`}>
                        {doc.title || 'Không có tiêu đề'}
                      </div>
                      <div className={`text-[10px] flex items-center gap-2 truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#86868B]'}`}>
                        <span>{doc.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}</span>
                        {folder && (
                          <>
                            <span>/</span>
                            <span>{folder.name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(doc.updatedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.tags.slice(0, 1).map((t) => (
                      <span
                        key={t}
                        className={`text-[9px] px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#F2F2F7] text-[#6E6E73] border border-[#E5E5EA]'
                        }`}
                      >
                        #{t}
                      </span>
                    ))}
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#86868B]'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#F8F8FA] border-t border-[#E5E5EA] flex items-center justify-between text-[11px] text-[#86868B]">
          <div className="flex items-center gap-3">
            <span>↑↓ để di chuyển</span>
            <span>↵ để chọn</span>
            <span>esc để thoát</span>
          </div>
          <button
            onClick={() => {
              onOpenTemplates();
              onClose();
            }}
            className="text-[11px] text-[#1D1D1F] font-semibold hover:underline"
          >
            Xem kho mẫu Lark →
          </button>
        </div>
      </div>
    </div>
  );
};
