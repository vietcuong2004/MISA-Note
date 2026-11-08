import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserPlus,
  MoreHorizontal,
  FolderOpen,
  Download,
  Trash2,
  Sparkles,
  Check,
  Clock,
  Lock,
  Globe,
  Star,
  Plus,
  GripVertical,
  HelpCircle,
  Pencil,
  ArrowRight,
  Link2,
} from 'lucide-react';
import { Block, BlockProperties, BlockType, Document, Folder, UserRole, ViewState } from '../../types';
import { BlockItem } from './BlockItem';
import { SlashMenu } from './SlashMenu';
import { ShareModal } from '../modals/ShareModal';
import { MoveModal } from '../modals/MoveModal';
import { ExportModal } from '../modals/ExportModal';
import { documentUrl } from '../../app/router/routes';
import { getFolderPath } from '../../utils/folders';

interface BlockEditorProps {
  document: Document;
  folders: Folder[];
  currentRole: UserRole;
  onUpdateDocument: (doc: Document) => void;
  onSoftDeleteDocument: (docId: string) => void;
  onToggleFavorite: (docId: string) => void;
  onMoveDocument: (docId: string, folderId: string | null, space: any) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onRoleChange?: (newRole: UserRole) => void;
  onNavigate?: (view: ViewState) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  document,
  folders,
  currentRole,
  onUpdateDocument,
  onSoftDeleteDocument,
  onToggleFavorite,
  onMoveDocument,
  onToast,
  onNavigate,
}) => {
  const [doc, setDoc] = useState<Document>(document);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Modals state
  const [shareOpen, setShareOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Drag and drop block reordering state
  const [draggingBlockIndex, setDraggingBlockIndex] = useState<number | null>(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(null);

  // Slash Menu state
  const [slashState, setSlashState] = useState<{
    isOpen: boolean;
    blockId: string | null;
    query: string;
    position?: { top: number; left: number };
  }>({
    isOpen: false,
    blockId: null,
    query: '',
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<Document | null>(null);
  const saveCallbackRef = useRef(onUpdateDocument);
  saveCallbackRef.current = onUpdateDocument;
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDoc(document);
  }, [document.id]);

  // Commit pending edits before navigating away or refreshing a document URL.
  useEffect(() => {
    const flushPendingSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (pending) saveCallbackRef.current(pending);
    };
    window.addEventListener('beforeunload', flushPendingSave);
    return () => {
      window.removeEventListener('beforeunload', flushPendingSave);
      flushPendingSave();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced auto-save function
  const triggerAutoSave = useCallback(
    (updatedDoc: Document) => {
      setSaveStatus('saving');
      pendingSaveRef.current = updatedDoc;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        pendingSaveRef.current = null;
        saveCallbackRef.current(updatedDoc);
        setSaveStatus('saved');
      }, 350);
    },
    []
  );

  const updateDocField = (field: keyof Document, value: any) => {
    const updated = { ...doc, [field]: value, updatedAt: new Date().toISOString() };
    setDoc(updated);
    triggerAutoSave(updated);
  };

  const currentFolder = folders.find((f) => f.id === doc.folderId);

  // Block management
  const handleUpdateBlock = (blockId: string, content: string, properties?: any) => {
    const updatedBlocks = doc.blocks.map((b) =>
      b.id === blockId ? { ...b, content, properties: properties || b.properties } : b
    );
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (doc.blocks.length <= 1) return;
    const updatedBlocks = doc.blocks.filter((b) => b.id !== blockId);
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
  };

  const handleDuplicateBlock = (blockId: string) => {
    const index = doc.blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;
    const sourceBlock = doc.blocks[index];
    const newBlock: Block = {
      ...sourceBlock,
      id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    const updatedBlocks = [...doc.blocks];
    updatedBlocks.splice(index + 1, 0, newBlock);
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
    onToast('Đã nhân bản khối');
  };

  const handleMoveBlockUp = (blockId: string) => {
    const index = doc.blocks.findIndex((b) => b.id === blockId);
    if (index <= 0) return;
    const updatedBlocks = [...doc.blocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[index - 1];
    updatedBlocks[index - 1] = temp;
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
  };

  const handleMoveBlockDown = (blockId: string) => {
    const index = doc.blocks.findIndex((b) => b.id === blockId);
    if (index === -1 || index >= doc.blocks.length - 1) return;
    const updatedBlocks = [...doc.blocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[index + 1];
    updatedBlocks[index + 1] = temp;
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
  };

  const handleReorderBlock = (sourceIndex: number, targetIndex: number) => {
    setDraggingBlockIndex(null);
    setDragOverBlockIndex(null);
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= doc.blocks.length ||
      targetIndex >= doc.blocks.length
    ) {
      return;
    }
    const updatedBlocks = [...doc.blocks];
    const [movedBlock] = updatedBlocks.splice(sourceIndex, 1);
    updatedBlocks.splice(targetIndex, 0, movedBlock);
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
    onToast('Đã di chuyển vị trí đề mục');
  };

  const handleAddBlockBelow = (index: number) => {
    const newBlock: Block = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'paragraph',
      content: '',
    };
    const updatedBlocks = [...doc.blocks];
    updatedBlocks.splice(index + 1, 0, newBlock);
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
  };

  // Slash trigger
  const handleTriggerSlash = (blockId: string, query: string, rect: DOMRect | null) => {
    if (!rect) {
      setSlashState({ isOpen: false, blockId: null, query: '' });
      return;
    }
    setSlashState({
      isOpen: true,
      blockId,
      query,
      position: {
        top: rect.bottom + 6,
        left: rect.left,
      },
    });
  };

  const handleSelectSlashItem = (type: BlockType, extraProps?: BlockProperties) => {
    if (!slashState.blockId) return;

    const updatedBlocks = doc.blocks.map((b) => {
      if (b.id === slashState.blockId) {
        let props: any = {};
        if (type === 'checklist') props = { checked: false };
        if (type === 'toggle') props = { open: true, caption: '' };
        if (type === 'callout') props = { calloutType: 'info' };
        if (type === 'meeting_info') {
          props = {
            meetingTime: '09:00 - 10:30',
            meetingDate: new Date().toLocaleDateString('vi-VN'),
            meetingLocation: 'Phòng họp & Google Meet',
            meetingLink: 'https://meet.google.com/xyz',
          };
        }
        if (type === 'meeting_attendees') {
          props = {
            attendees: [
              { name: 'Việt Cường', role: 'Chủ trì', status: 'present' },
              { name: 'Trần Thị Thu Hà', role: 'Tham dự', status: 'present' },
            ],
          };
        }
        if (type === 'meeting_agenda') {
          props = {
            agenda: [
              { id: 'ag_1', title: 'Nội dung thảo luận 1', duration: '15 phút', speaker: 'Cả nhóm' },
            ],
          };
        }
        if (type === 'meeting_action_items') {
          props = {
            actionItems: [
              {
                id: 'act_1',
                task: 'Đầu việc cần làm',
                assignee: 'Việt Cường',
                dueDate: 'Hết tuần',
                completed: false,
                priority: 'medium',
              },
            ],
          };
        }
        if (type === 'table') {
          props = {
            tableData: {
              headers: ['Hạng mục', 'Mô tả', 'Tiến độ'],
              rows: [
                ['Việc 1', 'Nội dung chi tiết', 'Đang làm'],
                ['Việc 2', 'Nghiệm thu chất lượng', 'Chờ xử lý'],
              ],
            },
          };
        }
        if (type === 'code') {
          props = { language: 'typescript' };
        }
        if (type === 'file') {
          props = { fileSize: '1.8 MB' };
        }
        if (type === 'link') {
          props = { url: 'https://workspace.congty.vn' };
        }
        if (type === 'image') {
          props = {
            url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&auto=format&fit=crop&q=80',
          };
        }

        return {
          ...b,
          type,
          content: '',
          properties: { ...props, ...extraProps },
        };
      }
      return b;
    });

    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
    setSlashState({ isOpen: false, blockId: null, query: '' });
  };

  const isReadOnly = currentRole === 'viewer';

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--ui-surface)] overflow-hidden relative">
      {/* Top Header Bar matching screenshot: Breadcrumbs on left, [Chia sẻ] and [•••] on right */}
      <div className="h-14 border-b border-[var(--ui-border)] px-8 flex items-center justify-between gap-4 bg-[var(--ui-surface)] sticky top-0 z-30">
        {/* Breadcrumb matching screenshot: "Ghi chép của tôi / Công việc / Kế hoạch tuần" */}
        <div className="flex items-center gap-2 text-xs text-[var(--ui-muted)] min-w-0 font-medium">
          <button type="button" onClick={() => onNavigate?.({ type: doc.space === 'personal' ? 'private' : 'company' })} className="truncate hover:underline">
            {doc.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}
          </button>
          <span className="text-[#C7C7CC]">/</span>
          {currentFolder && (
            <>
              <button type="button" onClick={() => onNavigate?.({ type: 'folder', folderId: currentFolder.id })} className="truncate hover:underline">{getFolderPath(currentFolder.id, folders)}</button>
              <span className="text-[#C7C7CC]">/</span>
            </>
          )}
          <span className="truncate text-[var(--ui-text)] font-semibold">{doc.title}</span>
        </div>

        {/* Action Buttons Toolbar: [Yêu thích] [+ Chia sẻ] [•••] */}
        <div className="flex items-center gap-2 shrink-0" ref={moreMenuRef}>
          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={() => {
              onToggleFavorite(doc.id);
              setDoc((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ios-interactive shadow-2xs cursor-pointer ${
              doc.isFavorite
                ? 'theme-primary bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]'
                : 'bg-[var(--ui-surface)] border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
            }`}
            title={doc.isFavorite ? 'Xóa khỏi Yêu thích' : 'Thêm vào yêu thích'}
          >
            <Star
              className={`w-3.5 h-3.5 stroke-[1.75] ${
                doc.isFavorite ? 'fill-white text-white' : 'text-[var(--ui-text)]'
              }`}
            />
            <span>
              {doc.isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
            </span>
          </button>

          {/* Share Button (white rounded-xl with border) */}
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] transition-colors ios-interactive shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Chia sẻ</span>
          </button>

          {/* More options button (•••) */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-8 h-8 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-text)] transition-colors ios-interactive shadow-2xs cursor-pointer"
              title="Tùy chọn khác"
            >
              <MoreHorizontal className="w-4 h-4 stroke-[1.75]" />
            </button>

            {/* Dropdown Menu matching screenshot */}
            {showMoreMenu && (
              <div className="absolute right-0 top-9 z-40 w-48 bg-[var(--ui-surface)] rounded-2xl ios-elevated-shadow border border-[var(--ui-border)] py-1.5 text-xs animate-in zoom-in-95 duration-100 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    titleInputRef.current?.focus();
                  }}
                  className="w-full px-3.5 py-2 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
                  <span>Đổi tên</span>
                </button>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoveOpen(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
                    <span>Di chuyển</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(documentUrl(window.location.origin, doc.id));
                    onToast('Đã sao chép liên kết vào bộ nhớ tạm');
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Link2 className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
                  <span>Sao chép liên kết</span>
                </button>

                {!isReadOnly && (
                  <>
                    <div className="border-t border-[#F2F2F7] my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        onSoftDeleteDocument(doc.id);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
                      <span>Chuyển vào thùng rác</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Canvas exactly matching screenshot */}
      <div className="flex-1 overflow-y-auto px-8 py-10 md:px-20 lg:px-32">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Document Title matching screenshot */}
          <div>
            <input
              ref={titleInputRef}
              type="text"
              disabled={isReadOnly}
              value={doc.title}
              onChange={(e) => updateDocField('title', e.target.value)}
              placeholder="Tiêu đề trang..."
              className="w-full text-3xl md:text-4xl font-bold text-[var(--ui-text)] bg-transparent focus:outline-none placeholder:text-[#C7C7CC] tracking-tight leading-tight"
            />

            {/* Meta Status matching screenshot: "✓ Đã lưu  ·  Cập nhật 2 phút trước" */}
            <div className="flex items-center gap-2 text-xs text-[var(--ui-tertiary)] mt-2 font-normal">
              <span className="flex items-center gap-1 text-[var(--ui-text-secondary)]">
                <Check className="w-3.5 h-3.5 stroke-[2]" />
                <span>Đã lưu</span>
              </span>
              <span>·</span>
              <span>Cập nhật 2 phút trước</span>
            </div>
          </div>

          {/* Blocks container */}
          <div className="space-y-2 relative min-h-[300px] pt-2">
            {doc.blocks.map((block, idx) => (
              <BlockItem
                key={block.id}
                block={block}
                index={idx}
                totalBlocks={doc.blocks.length}
                userRole={currentRole}
                isDragging={draggingBlockIndex === idx}
                isDragOver={dragOverBlockIndex === idx && draggingBlockIndex !== idx}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onDuplicate={handleDuplicateBlock}
                onMoveUp={handleMoveBlockUp}
                onMoveDown={handleMoveBlockDown}
                onAddBelow={handleAddBlockBelow}
                onTriggerSlash={handleTriggerSlash}
                onDragStartBlock={(dragIdx) => setDraggingBlockIndex(dragIdx)}
                onDragOverBlock={(overIdx) => setDragOverBlockIndex(overIdx)}
                onDropBlock={handleReorderBlock}
                onDragEndBlock={() => {
                  setDraggingBlockIndex(null);
                  setDragOverBlockIndex(null);
                }}
              />
            ))}

            {/* Slash Command Dropdown */}
            {slashState.isOpen && (
              <SlashMenu
                query={slashState.query}
                position={slashState.position}
                onSelect={handleSelectSlashItem}
                onClose={() => setSlashState({ isOpen: false, blockId: null, query: '' })}
              />
            )}

            {/* Bottom prompt matching screenshot: [ + :: Gõ / để chèn nội dung... ] */}
            {!isReadOnly && (
              <div
                className="flex items-center gap-1.5 text-[var(--ui-tertiary)] text-xs pt-3 pb-4 cursor-text group"
                onClick={() => handleAddBlockBelow(doc.blocks.length - 1)}
              >
                <span className="p-0.5 rounded text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]">
                  <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
                </span>
                <span className="p-0.5 rounded text-[var(--ui-tertiary)] group-hover:text-[var(--ui-text)]">
                  <GripVertical className="w-3.5 h-3.5 stroke-[1.75]" />
                </span>
                <span className="text-[var(--ui-tertiary)] text-xs ml-0.5">Gõ / để chèn nội dung...</span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Floating help button '?' at bottom right matching screenshot */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="w-8 h-8 rounded-full bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-2xs hover:bg-[var(--ui-hover)] flex items-center justify-center text-xs font-semibold text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] transition-all ios-interactive"
          title="Trợ giúp"
        >
          ?
        </button>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
          <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 stroke-[1.75] text-[var(--ui-text)]" />
                <h3 className="text-sm font-bold text-[var(--ui-text)]">Hướng dẫn & Phím tắt</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs text-[var(--ui-tertiary)] hover:text-[var(--ui-text)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-[var(--ui-muted)] leading-relaxed">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--ui-subtle)]">
                <span>Mở menu 20 tiện ích</span>
                <span className="font-mono font-bold text-[var(--ui-text)] px-1.5 py-0.5 rounded bg-[var(--ui-surface)] border border-[var(--ui-border)]">/</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--ui-subtle)]">
                <span>Tìm kiếm & hỏi</span>
                <span className="font-mono font-bold text-[var(--ui-text)] px-1.5 py-0.5 rounded bg-[var(--ui-surface)] border border-[var(--ui-border)]">Ctrl + K</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--ui-subtle)]">
                <span>Tự động lưu</span>
                <span className="text-[var(--ui-text)] font-semibold">Tức thì</span>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 rounded-xl theme-primary bg-[var(--ui-primary)] text-white text-xs font-semibold hover:bg-[var(--ui-primary-hover)] transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ShareModal
        document={doc}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        onUpdatePermission={(role, isPrivate) => {
          updateDocField('permission', role);
          updateDocField('isPrivate', isPrivate);
        }}
        onToast={onToast}
      />

      <MoveModal
        document={doc}
        folders={folders}
        isOpen={moveOpen}
        onClose={() => setMoveOpen(false)}
        onMove={(docId, folderId, space) => {
          onMoveDocument(docId, folderId, space);
          setDoc((prev) => ({ ...prev, folderId, space }));
        }}
        onToast={onToast}
      />

      <ExportModal
        document={doc}
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onToast={onToast}
      />
    </div>
  );
};
