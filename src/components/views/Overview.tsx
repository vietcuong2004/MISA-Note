import { formatDateTime } from '../../utils/dateTime';
import React, { useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  MessageSquare,
  Sparkles,
  Star,
  Clock,
  Folder,
  Compass,
  BookOpen,
  CheckSquare,
} from 'lucide-react';
import { Document, Folder as FolderType } from '../../types';
import { CURRENT_USER, TEMPLATES } from '../../data/mockData';

interface OverviewProps {
  documents: Document[];
  folders: FolderType[];
  onOpenDocument: (docId: string) => void;
  onCreateFromTemplate: (templateId: string) => void;
  onOpenNewChat: () => void;
  onOpenOneAI: () => void;
  onToggleFavorite: (docId: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  documents,
  folders,
  onOpenDocument,
  onCreateFromTemplate,
  onOpenNewChat,
  onOpenOneAI,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'personal' | 'company' | 'meeting' | 'favorite'>('all');

  const activeDocs = documents.filter((d) => !d.isTrash);

  const filteredDocs = activeDocs.filter((doc) => {
    if (filterTab === 'personal' && doc.space !== 'personal') return false;
    if (filterTab === 'company' && doc.space !== 'company') return false;
    if (filterTab === 'meeting' && doc.type !== 'meeting') return false;
    if (filterTab === 'favorite' && !doc.isFavorite) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchTag = doc.tags.some((t) => t.toLowerCase().includes(q));
      const matchContent = doc.blocks.some((b) => b.content.toLowerCase().includes(q));
      return matchTitle || matchTag || matchContent;
    }

    return true;
  });

  const recentDocs = [...filteredDocs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ui-bg)] p-6 md:p-10 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Apple Style Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold text-[var(--ui-tertiary)] uppercase tracking-wider mb-1">
              Không gian làm việc
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ui-text)]">
              Chào buổi sáng, {CURRENT_USER.name}
            </h1>
            <p className="text-xs text-[var(--ui-muted)] mt-1">
              Quản lý ghi chú cá nhân, tài liệu công ty và biên bản cuộc họp
            </p>
          </div>

          {/* iOS Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--ui-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu, biên bản..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] ios-card-shadow transition-all text-[var(--ui-text)] placeholder:text-[var(--ui-tertiary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions (Unified monochromatic Apple style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Tạo ghi chú */}
          <button
            type="button"
            onClick={() => onCreateFromTemplate('tpl_personal_note')}
            className="p-4 rounded-[18px] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] hover:-translate-y-0.5 ios-card-shadow text-left ios-interactive flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--ui-hover)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text)] group-hover:bg-[var(--ui-primary)] group-hover:text-white transition-all">
              <FileText className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--ui-text)]">Tạo ghi chú</div>
              <div className="text-[11px] text-[var(--ui-tertiary)] mt-0.5">Bản thảo cá nhân tức thì</div>
            </div>
          </button>

          {/* 2. Tạo biên bản cuộc họp */}
          <button
            type="button"
            onClick={() => onCreateFromTemplate('tpl_meeting_minutes')}
            className="p-4 rounded-[18px] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] hover:-translate-y-0.5 ios-card-shadow text-left ios-interactive flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--ui-hover)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text)] group-hover:bg-[var(--ui-primary)] group-hover:text-white transition-all">
              <Calendar className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--ui-text)]">Tạo biên bản cuộc họp</div>
              <div className="text-[11px] text-[var(--ui-tertiary)] mt-0.5">Thời gian, kết luận, đầu việc</div>
            </div>
          </button>

          {/* 3. Chat mới */}
          <button
            type="button"
            onClick={onOpenNewChat}
            className="p-4 rounded-[18px] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] hover:-translate-y-0.5 ios-card-shadow text-left ios-interactive flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--ui-hover)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text)] group-hover:bg-[var(--ui-primary)] group-hover:text-white transition-all">
              <MessageSquare className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--ui-text)]">Chat mới</div>
              <div className="text-[11px] text-[var(--ui-tertiary)] mt-0.5">Trao đổi nhanh cùng nhóm</div>
            </div>
          </button>

          {/* 4. Hỏi One AI */}
          <button
            type="button"
            onClick={onOpenOneAI}
            className="p-4 rounded-[18px] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] hover:-translate-y-0.5 ios-card-shadow text-left ios-interactive flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--ui-hover)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text)] group-hover:bg-[var(--ui-primary)] group-hover:text-white transition-all">
              <Sparkles className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--ui-text)] flex items-center gap-1.5">
                <span>Hỏi AI</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--ui-hover)] text-[var(--ui-text)] font-semibold border border-[var(--ui-border)]">
                  One AI
                </span>
              </div>
              <div className="text-[11px] text-[var(--ui-tertiary)] mt-0.5">Chờ kết nối One AI</div>
            </div>
          </button>
        </div>

        {/* Templates Carousel / Row */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--ui-text)] uppercase tracking-wider">
              Mẫu tài liệu chuẩn bị sẵn
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-[18px] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] hover:-translate-y-0.5 ios-card-shadow transition-all flex flex-col justify-between h-48"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[var(--ui-hover)] border border-[var(--ui-border)] flex items-center justify-center text-sm mb-2.5">
                    {tpl.icon}
                  </div>
                  <div className="text-xs font-semibold text-[var(--ui-text)]">{tpl.title}</div>
                  <div className="text-[11px] text-[var(--ui-muted)] mt-1 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateFromTemplate(tpl.id)}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--ui-hover)] hover:bg-[var(--ui-primary)] hover:text-white text-[var(--ui-text)] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ios-interactive"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>Dùng mẫu này</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Segmented Control & Recent Documents */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Apple iOS Segmented Control (Monochrome) */}
            <div className="flex items-center gap-1 p-1 bg-[#767680]/10 rounded-xl overflow-x-auto">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'personal', label: 'Ghi chép của tôi' },
                { id: 'company', label: 'Tài liệu công ty' },
                { id: 'meeting', label: 'Biên bản cuộc họp' },
                { id: 'favorite', label: 'Được gắn sao' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    filterTab === tab.id
                      ? 'bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-xs font-semibold'
                      : 'text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-[var(--ui-tertiary)] font-mono tabular-nums">
              {recentDocs.length} tài liệu
            </span>
          </div>

          {/* Documents Grid / Empty State */}
          {recentDocs.length === 0 ? (
            <div className="p-14 text-center bg-[var(--ui-surface)] rounded-[20px] border border-[var(--ui-border)] ios-card-shadow space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ui-hover)] mx-auto flex items-center justify-center text-[var(--ui-tertiary)]">
                <FileText className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--ui-text)]">Không tìm thấy tài liệu nào</h3>
              <p className="text-xs text-[var(--ui-muted)] max-w-sm mx-auto">
                {searchQuery
                  ? `Không có kết quả khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm cụm từ khác.`
                  : 'Chưa có tài liệu nào trong danh mục này. Hãy bắt đầu bằng cách tạo một ghi chú mới!'}
              </p>
              <button
                type="button"
                onClick={() => onCreateFromTemplate('tpl_personal_note')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl theme-primary bg-[var(--ui-primary)] text-white text-xs font-medium hover:bg-[var(--ui-primary-hover)] transition-colors shadow-xs ios-interactive"
              >
                <Plus className="w-4 h-4 stroke-[1.75]" />
                <span>Tạo ghi chú mới</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentDocs.map((doc) => {
                const folder = folders.find((f) => f.id === doc.folderId);

                return (
                  <div
                    key={doc.id}
                    onClick={() => onOpenDocument(doc.id)}
                    className="p-4 rounded-[18px] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] hover:-translate-y-0.5 ios-card-shadow cursor-pointer transition-all flex flex-col justify-between group space-y-3 h-40"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FileText className="w-5 h-5 stroke-[1.75] text-[var(--ui-text)]" />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--ui-hover)] text-[var(--ui-muted)] border border-[var(--ui-border)]">
                            {doc.space === 'personal' ? 'Cá nhân' : 'Công ty'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(doc.id);
                            }}
                            className="p-1 rounded-lg text-[#C7C7CC] hover:text-[var(--ui-text)] transition-colors"
                          >
                            <Star
                              className={`w-3.5 h-3.5 stroke-[1.75] ${
                                doc.isFavorite ? 'text-[var(--ui-text)] fill-[#1D1D1F]' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-[var(--ui-text)] group-hover:text-black transition-colors line-clamp-1">
                          {doc.title || 'Không có tiêu đề'}
                        </h3>
                        <p className="text-[11px] text-[var(--ui-muted)] mt-1 line-clamp-2 leading-relaxed">
                          {doc.blocks.find((b) => b.content.trim())?.content || 'Chưa có nội dung văn bản...'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F2F2F7] flex items-center justify-between text-[10px] text-[var(--ui-tertiary)]">
                      <div className="flex items-center gap-1 truncate max-w-[150px]">
                        {folder ? (
                          <>
                            <Folder className="w-3 h-3 shrink-0 stroke-[1.75]" />
                            <span className="truncate">{folder.name}</span>
                          </>
                        ) : (
                          <span>Thư mục gốc</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-mono tabular-nums">
                        <Clock className="w-3 h-3 stroke-[1.75]" />
                        <span>{formatDateTime(doc.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
