import { TableBlock } from './TableBlock';
import { LinkBlock } from './LinkBlock';
import { AttachmentBlock } from './AttachmentBlock';
import { AudioBlock } from './AudioBlock';
import { ImageBlock } from './ImageBlock';
import { ListBlock } from './ListBlock';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Paperclip,
  Code2,
  Calendar,
  Users,
  Clock,
  CheckSquare,
  PlusCircle,
} from 'lucide-react';
import { Block, BlockType, UserRole } from '../../types';
import { TEAM_MEMBERS } from '../../data/mockData';
import { UtilityBlock } from './UtilityBlock';

interface BlockItemProps {
  block: Block;
  index: number;
  totalBlocks: number;
  userRole: UserRole;
  isDragging?: boolean;
  isDragOver?: boolean;
  autoFocus?: boolean;
  openMenuInitially?: boolean;
  afterList?: boolean;
  onUpdate: (blockId: string, content: string, properties?: any) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onAddBelow: (index: number) => void;
  onTriggerSlash: (blockId: string, query: string, rect: DOMRect | null) => void;
  onDragStartBlock?: (index: number) => void;
  onDragOverBlock?: (index: number) => void;
  onDropBlock?: (sourceIndex: number, targetIndex: number) => void;
  onDragEndBlock?: () => void;
}

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  totalBlocks,
  userRole,
  isDragging = false,
  isDragOver = false,
  autoFocus = false,
  openMenuInitially = false,
  afterList = false,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onTriggerSlash,
  onDragStartBlock,
  onDragOverBlock,
  onDropBlock,
  onDragEndBlock,
}) => {
  const isReadOnly = userRole === 'viewer';
  const [showMenu, setShowMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openMenuInitially && !isReadOnly) setShowMenu(true);
  }, [openMenuInitially, isReadOnly]);

  useLayoutEffect(() => {
    if (!autoFocus || isReadOnly) return;
    textRef.current?.focus();
    textRef.current?.setSelectionRange(0, 0);
    textRef.current?.scrollIntoView({ block: 'nearest' });
  }, [autoFocus, isReadOnly]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const adjustHeight = () => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = `${textRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [block.content]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdate(block.id, val, block.properties);

    if ((val.startsWith('/') || val.startsWith('@')) && textRef.current) {
      const rect = textRef.current.getBoundingClientRect();
      onTriggerSlash(block.id, val.startsWith('@') ? val : val.slice(1), rect);
    } else {
      onTriggerSlash(block.id, '', null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      if (['paragraph', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'checklist'].includes(block.type)) {
        e.preventDefault();
        onAddBelow(index);
      }
    } else if (e.key === 'Backspace' && block.content === '' && totalBlocks > 1) {
      e.preventDefault();
      onDelete(block.id);
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'video':
      case 'file':
        return <AttachmentBlock block={block} readOnly={isReadOnly}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;
      case 'audio':
        return <AudioBlock block={block} readOnly={isReadOnly}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;
      case 'embed':
      case 'utility':
        return <UtilityBlock block={block} readOnly={isReadOnly}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;
      case 'h4':
        return <textarea ref={textRef} rows={1} disabled={isReadOnly}
          value={block.content} onChange={handleTextChange} onKeyDown={handleKeyDown}
          placeholder="Tiêu đề 4..."
          className="w-full text-sm font-semibold bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] mt-1" />;
      case 'h1':
        return (
          <textarea
            ref={textRef}
            rows={1}
            disabled={isReadOnly}
            value={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Tiêu đề 1..."
            className="w-full text-2xl md:text-3xl font-extrabold text-[var(--ui-text)] bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] leading-tight tracking-tight"
          />
        );

      case 'h2':
        return (
          <textarea
            ref={textRef}
            rows={1}
            disabled={isReadOnly}
            value={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Tiêu đề 2..."
            className="w-full text-xl md:text-2xl font-bold text-[var(--ui-text)] bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] leading-snug tracking-tight mt-1"
          />
        );

      case 'h3':
        return (
          <textarea
            ref={textRef}
            rows={1}
            disabled={isReadOnly}
            value={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Tiêu đề 3..."
            className="w-full text-base md:text-lg font-semibold text-[var(--ui-text)] bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] tracking-tight mt-1"
          />
        );

      case 'bullet':
      case 'numbered':
      case 'checklist':
        return <ListBlock block={block} readOnly={isReadOnly} autoFocus={autoFocus}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;

      case 'toggle':
        const isOpen = !!block.properties?.open;
        return (
          <div className="w-full space-y-1.5">
            <div className="flex items-start gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdate(block.id, block.content, { ...block.properties, open: !isOpen })
                }
                className="mt-0.5 p-1 rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] ios-interactive"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 stroke-[1.75]" /> : <ChevronRight className="w-4 h-4 stroke-[1.75]" />}
              </button>
              <textarea
                ref={textRef}
                rows={1}
                disabled={isReadOnly}
                value={block.content}
                onChange={handleTextChange}
                placeholder="Tiêu đề mục thu gọn..."
                className={`w-full font-semibold text-[var(--ui-text)] bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] ${block.properties?.headingLevel === 1 ? 'text-2xl' : block.properties?.headingLevel === 2 ? 'text-xl' : block.properties?.headingLevel === 3 ? 'text-lg' : 'text-sm'}`}
              />
            </div>
            {isOpen && (
              <div className="pl-6 border-l-2 border-[var(--ui-border)] ml-3">
                <textarea
                  rows={2}
                  disabled={isReadOnly}
                  value={block.properties?.caption || ''}
                  onChange={(e) =>
                    onUpdate(block.id, block.content, {
                      ...block.properties,
                      caption: e.target.value,
                    })
                  }
                  placeholder="Nội dung chi tiết bên trong mục thu gọn..."
                  className="w-full text-xs text-[var(--ui-muted)] bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] leading-relaxed"
                />
              </div>
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="w-full pl-4 border-l-2 border-[var(--ui-primary)] py-1 my-1">
            <textarea
              ref={textRef}
              rows={1}
              disabled={isReadOnly}
              value={block.content}
              onChange={handleTextChange}
              placeholder="Nhập trích dẫn..."
              className="w-full text-sm italic text-[var(--ui-text-secondary)] bg-transparent resize-none focus:outline-none placeholder:text-[#C7C7CC] leading-relaxed"
            />
          </div>
        );

      // Clean neutral callout with prominent border and lightbulb icon
      case 'callout':
        return (
          <div
            data-callout-box
            className="w-full p-4 rounded-2xl border-[1.5px] border-[var(--ui-border-strong)] bg-[var(--ui-subtle)] shadow-xs flex items-start gap-3 my-1.5"
          >
            <span
              aria-hidden="true"
              className="w-6 h-6 flex items-center justify-center shrink-0 text-base leading-none select-none mt-0.5"
            >
              {block.properties?.calloutIcon || '💡'}
            </span>
            <div className="flex-1 min-w-0">
              <textarea
                ref={textRef}
                rows={1}
                disabled={isReadOnly}
                value={block.content}
                onChange={handleTextChange}
                placeholder="Nội dung chú thích nổi bật..."
                className="w-full text-xs font-medium bg-transparent resize-none focus:outline-none leading-relaxed text-[var(--ui-text)]"
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="w-full py-3 my-1">
            <div className="border-b border-[var(--ui-border)] w-full" />
          </div>
        );

      case 'code':
        return (
          <div className="w-full my-2 rounded-2xl overflow-hidden border border-[#3A3A3C] bg-[#1d1d1f] text-white ios-card-shadow">
            <div className="flex items-center justify-between px-4 py-2 bg-[#2C2C2E] border-b border-[#3A3A3C] text-[11px] text-[#AEAEB2]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8E8E93]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8E8E93]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8E8E93]" />
                </div>
                <span className="font-mono ml-2 text-xs">{block.properties?.language || 'typescript'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(block.content);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="flex items-center gap-1 text-[10px] text-[#AEAEB2] hover:text-white px-2 py-0.5 rounded-md hover:bg-[#3A3A3C] transition-colors ios-interactive"
              >
                {copiedCode ? <Check className="w-3 h-3 text-white" /> : <Code2 className="w-3 h-3 stroke-[1.75]" />}
                <span>{copiedCode ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              disabled={isReadOnly}
              value={block.content}
              onChange={(e) => onUpdate(block.id, e.target.value, block.properties)}
              placeholder="// Nhập mã nguồn tại đây..."
              className="w-full p-4 font-mono text-xs bg-transparent text-[#F2F2F7] focus:outline-none resize-y leading-relaxed"
            />
          </div>
        );

      case 'image':
        return <ImageBlock block={block} readOnly={isReadOnly}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;

      case 'link':
        return <LinkBlock block={block} readOnly={isReadOnly}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;

      case 'table':
        return <TableBlock block={block} readOnly={isReadOnly}
          onChange={(content, properties) => onUpdate(block.id, content, properties)} />;

      // Meeting Info with unified monochrome Lucide icon
      case 'meeting_info':
        const props = block.properties || {};
        return (
          <div className="w-full p-5 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-subtle)] ios-card-shadow space-y-3.5 my-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--ui-text)] border-b border-[var(--ui-border)] pb-2.5">
              <Calendar className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
              <span>Thông tin cuộc họp</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-[var(--ui-tertiary)] block">Thời gian họp</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={props.meetingTime || '09:00 - 10:30'}
                  onChange={(e) =>
                    onUpdate(block.id, block.content, { ...props, meetingTime: e.target.value })
                  }
                  className="w-full font-semibold text-[var(--ui-text)] bg-transparent focus:outline-none pt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--ui-tertiary)] block">Ngày diễn ra</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={props.meetingDate || 'Hôm nay'}
                  onChange={(e) =>
                    onUpdate(block.id, block.content, { ...props, meetingDate: e.target.value })
                  }
                  className="w-full font-semibold text-[var(--ui-text)] bg-transparent focus:outline-none pt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--ui-tertiary)] block">Địa điểm / Phòng họp</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={props.meetingLocation || 'Phòng họp Tầng 3'}
                  onChange={(e) =>
                    onUpdate(block.id, block.content, { ...props, meetingLocation: e.target.value })
                  }
                  className="w-full font-semibold text-[var(--ui-text)] bg-transparent focus:outline-none pt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--ui-tertiary)] block">Liên kết phòng trực tuyến</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={props.meetingLink || 'https://meet.google.com/abc-def-ghi'}
                  onChange={(e) =>
                    onUpdate(block.id, block.content, { ...props, meetingLink: e.target.value })
                  }
                  className="w-full font-semibold text-[var(--ui-text)] underline bg-transparent focus:outline-none pt-0.5 truncate"
                />
              </div>
            </div>
          </div>
        );

      case 'meeting_attendees':
        const attendees = block.properties?.attendees || [
          { name: 'Nguyễn Văn Minh', role: 'Chủ trì', status: 'present' },
          { name: 'Trần Thị Thu Hà', role: 'Thành viên', status: 'present' },
        ];

        const toggleStatus = (idx: number) => {
          if (isReadOnly) return;
          const nextStatusMap: Record<string, 'present' | 'absent' | 'excused'> = {
            present: 'absent',
            absent: 'excused',
            excused: 'present',
          };
          const updated = [...attendees];
          updated[idx] = { ...updated[idx], status: nextStatusMap[updated[idx].status] };
          onUpdate(block.id, block.content, { ...block.properties, attendees: updated });
        };

        const addAttendee = () => {
          const updated = [
            ...attendees,
            { name: 'Thành viên mới', role: 'Tham dự', status: 'present' as const },
          ];
          onUpdate(block.id, block.content, { ...block.properties, attendees: updated });
        };

        return (
          <div className="w-full p-5 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] ios-card-shadow space-y-3.5 my-2">
            <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--ui-text)]">
                <Users className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Thành phần tham dự ({attendees.length} người)</span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addAttendee}
                  className="text-[11px] text-[var(--ui-text)] font-semibold flex items-center gap-1 hover:underline ios-interactive"
                >
                  <PlusCircle className="w-3.5 h-3.5 stroke-[1.75]" /> Thêm người
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {attendees.map((person, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[var(--ui-subtle)] border border-[var(--ui-border)] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--ui-text)] truncate">{person.name}</div>
                    <div className="text-[10px] text-[var(--ui-tertiary)] truncate">{person.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(idx)}
                    className="text-[10px] px-2.5 py-0.5 rounded-md font-semibold shrink-0 transition-colors bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)]"
                  >
                    {person.status === 'present'
                      ? 'Có mặt'
                      : person.status === 'absent'
                      ? 'Vắng'
                      : 'Có phép'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'meeting_agenda':
        const agenda = block.properties?.agenda || [];
        const addAgendaItem = () => {
          const newItem = {
            id: `ag_${Date.now()}`,
            title: 'Chủ đề thảo luận mới',
            duration: '15 phút',
            speaker: 'Cả nhóm',
            notes: '',
          };
          onUpdate(block.id, block.content, {
            ...block.properties,
            agenda: [...agenda, newItem],
          });
        };

        return (
          <div className="w-full p-5 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] ios-card-shadow space-y-3.5 my-2">
            <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--ui-text)]">
                <Clock className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Chương trình cuộc họp</span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addAgendaItem}
                  className="text-[11px] text-[var(--ui-text)] font-semibold flex items-center gap-1 hover:underline ios-interactive"
                >
                  <PlusCircle className="w-3.5 h-3.5 stroke-[1.75]" /> Thêm mục
                </button>
              )}
            </div>
            <div className="space-y-2">
              {agenda.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[var(--ui-subtle)] border border-[var(--ui-border)] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--ui-text)]">
                      {idx + 1}. {item.title}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-[var(--ui-muted)] bg-[var(--ui-surface)] px-2 py-0.5 rounded-md border border-[var(--ui-border)] shrink-0">
                      {item.duration} · {item.speaker}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-[var(--ui-muted)] pl-3 border-l-2 border-[var(--ui-primary)]">
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'meeting_action_items':
        const actionItems = block.properties?.actionItems || [];
        const toggleItem = (itemId: string) => {
          if (isReadOnly) return;
          const updated = actionItems.map((act) =>
            act.id === itemId ? { ...act, completed: !act.completed } : act
          );
          onUpdate(block.id, block.content, { ...block.properties, actionItems: updated });
        };

        const addActionItem = () => {
          const newItem = {
            id: `act_${Date.now()}`,
            task: 'Nhiệm vụ mới cần theo dõi',
            assignee: TEAM_MEMBERS[0].name,
            dueDate: 'Hết tuần',
            completed: false,
            priority: 'medium' as const,
          };
          onUpdate(block.id, block.content, {
            ...block.properties,
            actionItems: [...actionItems, newItem],
          });
        };

        return (
          <div className="w-full p-5 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] ios-card-shadow space-y-3.5 my-2">
            <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--ui-text)]">
                <CheckSquare className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" />
                <span>Việc cần làm sau cuộc họp (Action Items)</span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addActionItem}
                  className="text-[11px] text-[var(--ui-text)] font-semibold flex items-center gap-1 hover:underline ios-interactive"
                >
                  <PlusCircle className="w-3.5 h-3.5 stroke-[1.75]" /> Thêm đầu việc
                </button>
              )}
            </div>
            <div className="divide-y divide-[#F2F2F7]">
              {actionItems.map((act) => (
                <div
                  key={act.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => toggleItem(act.id)}
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ios-interactive ${
                        act.completed
                          ? 'theme-primary bg-[var(--ui-primary)] border-[var(--ui-primary)] text-white'
                          : 'border-[#C7C7CC] hover:border-[var(--ui-primary)] bg-[var(--ui-surface)]'
                      }`}
                    >
                      {act.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span
                      className={`truncate ${
                        act.completed
                          ? 'line-through text-[var(--ui-tertiary)]'
                          : 'text-[var(--ui-text)] font-semibold'
                      }`}
                    >
                      {act.task}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                    <span className="text-[var(--ui-text)] bg-[var(--ui-hover)] px-2.5 py-0.5 rounded-md border border-[var(--ui-border)] font-medium">
                      👤 {act.assignee}
                    </span>
                    <span className="text-[var(--ui-tertiary)] bg-[var(--ui-hover)] px-2.5 py-0.5 rounded-md border border-[var(--ui-border)] font-medium font-mono tabular-nums">
                      ⏰ {act.dueDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'paragraph':
      default:
        return (
          <textarea
            ref={textRef}
            rows={1}
            disabled={isReadOnly}
            value={block.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              block.content === '/'
                ? 'Nhập để tìm kiếm'
                : afterList ? 'Nhấn / để chèn các khối' : 'Gõ nội dung hoặc gõ / để mở tiện ích...'
            }
            className={`w-full text-sm text-[var(--ui-text)] bg-transparent resize-none focus:outline-none placeholder:text-[var(--ui-tertiary)] leading-6 ${afterList ? 'placeholder:opacity-0 focus:placeholder:opacity-100' : ''} ${
              block.content.startsWith('/') ? 'font-mono' : ''
            }`}
          />
        );
    }
  };

  return (
    <div
      data-block-id={block.id}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        onDragOverBlock?.(index);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceIdxStr = e.dataTransfer.getData('text/plain');
        const sourceIndex = sourceIdxStr !== '' ? Number(sourceIdxStr) : null;
        if (sourceIndex !== null && !isNaN(sourceIndex)) {
          onDropBlock?.(sourceIndex, index);
        }
      }}
      className={`group relative flex items-start gap-0.5 py-1.5 -ml-14 pl-1 pr-2 rounded-xl transition-all ${
        isDragging ? 'opacity-30 bg-[var(--ui-hover)] border border-dashed border-[var(--ui-primary)]' : 'hover:bg-[var(--ui-hover)]/40'
      } ${isDragOver ? 'border-t-2 border-[var(--ui-primary)] -mt-0.5' : ''}`}
    >
      {isReadOnly ? <div aria-hidden="true" className="w-[50px] shrink-0" /> : (
        <div className="flex h-6 w-[50px] shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onAddBelow(index)}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-border)] transition-colors cursor-pointer"
            title="Thêm khối bên dưới"
          >
            <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>
          <div className="relative flex h-6 w-6 shrink-0 items-center justify-center" ref={menuRef}>
            <button
              type="button"
              draggable={!isReadOnly}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', String(index));
                e.dataTransfer.effectAllowed = 'move';
                onDragStartBlock?.(index);
              }}
              onDragEnd={() => {
                onDragEndBlock?.();
              }}
              onClick={() => setShowMenu(!showMenu)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-border)] transition-colors cursor-grab active:cursor-grabbing"
              title="Kéo để di chuyển hoặc bấm để mở tùy chọn"
            >
              <GripVertical className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>

            {showMenu && (
              <div className="absolute left-6 top-0 z-40 w-44 bg-[var(--ui-surface)]/95 backdrop-blur-xl rounded-2xl ios-elevated-shadow border border-[var(--ui-border)] py-1.5 text-xs animate-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    onDuplicate(block.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-[var(--ui-muted)] stroke-[1.75]" /> Nhân bản khối
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveUp(block.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-[var(--ui-muted)] stroke-[1.75]" /> Di chuyển lên
                  </button>
                )}
                {index < totalBlocks - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveDown(block.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-[var(--ui-muted)] stroke-[1.75]" /> Di chuyển xuống
                  </button>
                )}
                <div className="border-t border-[#F2F2F7] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    onDelete(block.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[var(--ui-tertiary)] stroke-[1.75]" /> Xóa khối
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 min-w-0 min-h-6 [&_textarea]:block
        ${block.properties?.bold !== undefined ? '[&_textarea]:[font-weight:inherit] [&_input]:[font-weight:inherit]' : ''}
        ${block.properties?.fontSize ? '[&_textarea]:text-[length:inherit] [&_input]:text-[length:inherit]' : ''}
        ${block.properties?.fontFamily ? '[&_textarea]:[font-family:inherit] [&_input]:[font-family:inherit]' : ''}
        ${block.properties?.italic ? '[&_textarea]:italic [&_input]:italic' : ''}
        ${block.properties?.underline ? '[&_textarea]:underline [&_input]:underline' : ''}
      `} style={{
        fontWeight: block.properties?.bold !== undefined ? (block.properties.bold ? 700 : 400) : undefined,
        fontStyle: block.properties?.italic ? 'italic' : undefined,
        textDecoration: block.properties?.underline ? 'underline' : undefined,
        fontFamily: block.properties?.fontFamily,
        fontSize: block.properties?.fontSize ? `${block.properties.fontSize}px` : undefined,
        color: block.properties?.textColor,
        backgroundColor: block.properties?.backgroundColor,
        ...(block.properties?.textColor ? { '--ui-text': block.properties.textColor } : {}),
      } as React.CSSProperties}>{renderBlockContent()}</div>
    </div>
  );
};
