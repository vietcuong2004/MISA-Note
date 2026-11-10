import { EmptyBlockRow } from './EmptyBlockRow';
import { RenameDialog } from '../modals/RenameDialog';
import { employeeName } from './EmployeePicker';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserPlus,
  MoreHorizontal,
  FolderOpen,
  Download,
  Sparkles,
  Check,
  Clock,
  Lock,
  Globe,
  Star,
  X,
  Plus,
} from 'lucide-react';
import { Block, BlockProperties, BlockType, Document, Folder, UserRole, ViewState } from '../../types';
import { BlockItem } from './BlockItem';
import { SlashMenu } from './SlashMenu';
import { EditTextDialog } from './EditTextDialog';
import { ShareModal } from '../modals/ShareModal';
import { MoveModal } from '../modals/MoveModal';
import { ExportModal } from '../modals/ExportModal';
import { DocumentActionMenu } from '../modals/DocumentActionMenu';
import { documentUrl } from '../../app/router/routes';
import { getFolderAncestors } from '../../utils/folders';

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
  const [renameOpen, setRenameOpen] = useState(false);
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
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDoc(document);
  }, [document.id, document.folderId, document.space, document.title, document.updatedAt]);

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
  const folderAncestors = currentFolder ? getFolderAncestors(currentFolder.id, folders) : [];

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

  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const handleAddBlockBelow = (index: number, openMenu = false) => {
    const newBlock: Block = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'paragraph',
      content: '',
    };
    const updatedBlocks = [...doc.blocks];
    updatedBlocks.splice(index + 1, 0, newBlock);
    setFocusedBlockId(newBlock.id);
    if (openMenu) setMenuBlockId(newBlock.id);
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
  };

  const handleExitList = (index: number, openMenu = false) => {
    const next = doc.blocks[index + 1];
    if (next?.type === 'paragraph') {
      const element = Array.from(window.document.querySelectorAll<HTMLElement>('[data-block-id]'))
        .find(node => node.dataset.blockId === next.id);
      element?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      if (openMenu) setMenuBlockId(next.id);
    } else handleAddBlockBelow(index, openMenu);
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

  const handleSlashColor = (color: string, isBackground: boolean) => {
    if (!slashState.blockId) return;
    const updated = { ...doc, updatedAt: new Date().toISOString(), blocks: doc.blocks.map(block =>
      block.id === slashState.blockId ? {
        ...block,
        content: block.content.replace(/^\/[^\n]*/, ''),
        properties: { ...block.properties, [isBackground ? 'backgroundColor' : 'textColor']: color || undefined },
      } : block) };
    setDoc(updated);
    triggerAutoSave(updated);
    setSlashState({ isOpen: false, blockId: null, query: '' });
  };

  const handleSelectSlashItem = (type: BlockType, extraProps?: BlockProperties) => {
    if (!slashState.blockId) return;

    const updatedBlocks = doc.blocks.map((b) => {
      if (b.id === slashState.blockId) {
        let props: any = {};
        if (['bullet', 'numbered', 'checklist'].includes(type)) props = {
          listItems: [{ id: `list_${crypto.randomUUID()}`, content: '', checked: false }],
        };
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
          content: extraProps?.mention ? `@${extraProps.mention.groupName || extraProps.mention.emails.map(employeeName).join(', ')}` : '',
          properties: { ...props, ...extraProps },
        };
      }
      return b;
    });

    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setFocusedBlockId(slashState.blockId);
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
    setSlashState({ isOpen: false, blockId: null, query: '' });
  };

function getTextareaSelectionCoords(
  el: HTMLTextAreaElement | HTMLInputElement,
  start: number,
  end: number
): { top: number; bottom: number; left: number } {
  const rect = el.getBoundingClientRect();
  if (typeof window === 'undefined' || !window.document) {
    return { top: rect.top, bottom: rect.bottom, left: rect.left };
  }

  if (el instanceof HTMLInputElement) {
    return { top: rect.top, bottom: rect.bottom, left: rect.left };
  }

  try {
    const doc = window.document;
    const style = window.getComputedStyle(el);
    const mirror = doc.createElement('div');
    const properties = [
      'boxSizing',
      'width',
      'paddingTop',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
      'borderTopWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderRightWidth',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'letterSpacing',
      'lineHeight',
      'whiteSpace',
      'wordWrap',
      'wordBreak',
    ];

    properties.forEach((prop) => {
      (mirror.style as any)[prop] = (style as any)[prop];
    });

    mirror.style.position = 'fixed';
    mirror.style.top = '-9999px';
    mirror.style.left = '-9999px';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';

    const textBefore = el.value.substring(0, start);
    const selectedText = el.value.substring(start, end);

    mirror.textContent = textBefore;

    const span = doc.createElement('span');
    span.textContent = selectedText || ' ';
    mirror.appendChild(span);

    doc.body.appendChild(mirror);

    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    const topOffset = spanRect.top - mirrorRect.top;
    const leftOffset = spanRect.left - mirrorRect.left;
    const height = spanRect.height || 22;

    doc.body.removeChild(mirror);

    const scrollTop = el.scrollTop || 0;
    const lineTop = rect.top + topOffset - scrollTop;
    const lineBottom = lineTop + height;
    const selLeft = rect.left + leftOffset;

    if (lineBottom >= rect.top && lineBottom <= rect.bottom + 40) {
      return { top: lineTop, bottom: lineBottom, left: selLeft };
    }
  } catch (_e) {
    // fallback
  }

  return { top: rect.top, bottom: rect.bottom, left: rect.left };
}

  // Text selection format dialog state
  const [editTextDialog, setEditTextDialog] = useState<{
    isOpen: boolean;
    position: {
      top: number;
      left: number;
      selectionTop?: number;
      selectionBottom?: number;
    };
    selectedText: string;
    blockId: string | null;
    blockType?: BlockType;
  }>({
    isOpen: false,
    position: { top: 0, left: 0 },
    selectedText: '',
    blockId: null,
  });

  const checkTextSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const docElem = window.document;
    if (!docElem) return;

    // Do not close if focus is currently inside the dialog (e.g. typing in search)
    const activeEl = docElem.activeElement;
    const isFocusInsideDialog =
      activeEl &&
      (activeEl.closest?.('[role="dialog"]') ||
        activeEl.closest?.('[aria-label="Định dạng văn bản"]'));

    if (isFocusInsideDialog) {
      return;
    }

    const editorContainer = docElem.getElementById('document-editor-container');

    // 1. Check if active element is textarea or input in editor
    if (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) {
      if (editorContainer && editorContainer.contains(activeEl)) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        if (start !== null && end !== null && end > start) {
          const text = activeEl.value.substring(start, end);
          if (text.trim().length > 0) {
            const blockElem = activeEl.closest('[data-block-id]');
            const bId = blockElem?.getAttribute('data-block-id') || null;
            const matchedBlock = doc.blocks.find((b) => b.id === bId);
            const coords = getTextareaSelectionCoords(activeEl, start, end);

            setEditTextDialog({
              isOpen: true,
              position: {
                top: coords.bottom + 8,
                left: Math.max(16, Math.min(coords.left, window.innerWidth - 300)),
                selectionTop: coords.top,
                selectionBottom: coords.bottom,
              },
              selectedText: text,
              blockId: bId,
              blockType: matchedBlock?.type || 'paragraph',
            });
            return;
          }
        }
      }
    }

    // 2. Check window selection
    const sel = typeof window.getSelection === 'function' ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const text = sel.toString();
      if (text.trim().length > 0) {
        const range = sel.getRangeAt(0);
        if (
          editorContainer &&
          (editorContainer.contains(range.commonAncestorContainer) ||
            (activeEl && editorContainer.contains(activeEl)))
        ) {
          const rect = range.getBoundingClientRect();
          const blockElem =
            (range.commonAncestorContainer as HTMLElement).closest?.('[data-block-id]') ||
            range.commonAncestorContainer.parentElement?.closest?.('[data-block-id]');
          const bId = blockElem?.getAttribute('data-block-id') || null;
          const matchedBlock = doc.blocks.find((b) => b.id === bId);

          setEditTextDialog({
            isOpen: true,
            position: {
              top: rect.bottom + 8,
              left: Math.max(16, Math.min(rect.left, window.innerWidth - 300)),
              selectionTop: rect.top,
              selectionBottom: rect.bottom,
            },
            selectedText: text,
            blockId: bId,
            blockType: matchedBlock?.type || 'paragraph',
          });
          return;
        }
      }
    }

    // 3. No highlighted text: Dialog MUST close immediately
    setEditTextDialog((prev) => (prev.isOpen ? { ...prev, isOpen: false, selectedText: '' } : prev));
  }, [doc.blocks]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.('[role="dialog"]') ||
        target?.closest?.('[aria-label="Định dạng văn bản"]')
      ) {
        return;
      }
      // Close open dialog when starting a new click/drag selection in editor
      setEditTextDialog((prev) => (prev.isOpen ? { ...prev, isOpen: false, selectedText: '' } : prev));
    };

    const handleMouseUp = () => {
      checkTextSelection();
    };

    const handleKeyUp = () => {
      checkTextSelection();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [checkTextSelection]);

  const handleTurnIntoBlock = (newType: BlockType, extraProps?: any) => {
    if (!editTextDialog.blockId) return;
    const updatedBlocks = doc.blocks.map((b) => {
      if (b.id === editTextDialog.blockId) {
        return {
          ...b,
          type: newType,
          properties: extraProps ? { ...b.properties, ...extraProps } : b.properties,
        };
      }
      return b;
    });
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
    onToast(`Đã chuyển thành ${newType}`);
  };

  const handleApplyColor = (colorHex: string, isBg?: boolean) => {
    if (!editTextDialog.blockId) return;
    const updatedBlocks = doc.blocks.map((b) => {
      if (b.id === editTextDialog.blockId) {
        const props = b.properties || {};
        return {
          ...b,
          properties: {
            ...props,
            [isBg ? 'backgroundColor' : 'textColor']: colorHex,
          },
        };
      }
      return b;
    });
    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setDoc(updatedDoc);
    triggerAutoSave(updatedDoc);
    onToast(isBg ? 'Đã đổi màu nền văn bản' : 'Đã đổi màu chữ');
  };

  const handleCopyBlockLink = () => {
    const url = documentUrl(window.location.origin, doc.id) + (editTextDialog.blockId ? `#${editTextDialog.blockId}` : '');
    navigator.clipboard?.writeText(url);
    onToast('Đã sao chép liên kết đến thành phần nội dung');
  };

  const handleDuplicateBlockOrText = () => {
    if (editTextDialog.blockId) {
      handleDuplicateBlock(editTextDialog.blockId);
      onToast('Đã nhân bản khối nội dung');
    } else {
      navigator.clipboard?.writeText(editTextDialog.selectedText);
      onToast('Đã sao chép văn bản');
    }
  };

  const handleDeleteSelection = () => {
    if (editTextDialog.blockId) {
      const block = doc.blocks.find((b) => b.id === editTextDialog.blockId);
      if (block) {
        if (block.content.trim() === editTextDialog.selectedText.trim()) {
          handleDeleteBlock(editTextDialog.blockId);
          onToast('Đã xóa khối nội dung');
        } else {
          const newContent = block.content.replace(editTextDialog.selectedText, '');
          handleUpdateBlock(editTextDialog.blockId, newContent, block.properties);
          onToast('Đã xóa đoạn văn bản');
        }
      }
    }
  };

  const handleCommentSelection = (text: string) => {
    onToast(`Đã gắn bình luận vào: "${text.slice(0, 30)}..."`);
  };

  const handleSuggestEdit = (_text: string) => {
    onToast('Chế độ đề xuất chỉnh sửa đã kích hoạt');
  };

  const handleAskAI = (text: string) => {
    onToast(`Hỏi AI về: "${text.slice(0, 30)}..."`);
  };

  const handleSkillAction = (skillId: string, _text: string) => {
    if (skillId === 'summarize') {
      onToast(`Đã tóm tắt đoạn văn bản đã chọn`);
    } else if (skillId === 'rewrite') {
      onToast(`Đã viết lại văn phong mượt mà hơn`);
    } else if (skillId === 'fixSpelling') {
      onToast(`Không tìm thấy lỗi chính tả trong đoạn này`);
    } else {
      onToast(`Đã thực hiện kỹ năng AI: ${skillId}`);
    }
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
          {folderAncestors.map((ancestor) => (
            <React.Fragment key={ancestor.id}>
              <button type="button" onClick={() => onNavigate?.({ type: 'folder', folderId: ancestor.id })} className="truncate hover:underline">
                {ancestor.name}
              </button>
              <span className="text-[#C7C7CC]">/</span>
            </React.Fragment>
          ))}
          <span className="truncate text-[var(--ui-text)] font-semibold">{doc.title}</span>
        </div>

        {/* Action Buttons Toolbar: [Yêu thích] [+ Chia sẻ] [•••] */}
        <div className="flex items-center gap-2 shrink-0">
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
              ref={moreButtonRef}
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="w-8 h-8 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-text)] transition-colors ios-interactive shadow-2xs cursor-pointer"
              title="Tùy chọn khác"
            >
              <MoreHorizontal className="w-4 h-4 stroke-[1.75]" />
            </button>

            <DocumentActionMenu
              isOpen={showMoreMenu}
              isFavorite={doc.isFavorite}
              triggerRef={moreButtonRef}
              onClose={() => setShowMoreMenu(false)}
              onToggleFavorite={() => {
                onToggleFavorite(doc.id);
                setDoc((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
              }}
              onShare={() => setShareOpen(true)}
              onRename={!isReadOnly ? () => setRenameOpen(true) : undefined}
              onMove={!isReadOnly ? () => setMoveOpen(true) : undefined}
              onDelete={!isReadOnly ? () => onSoftDeleteDocument(doc.id) : undefined}
            />
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
          <div id="document-editor-container" className="space-y-2 relative min-h-[300px] pt-2">
            {doc.blocks.map((block, idx) => (
              <React.Fragment key={block.id}>
              <BlockItem
                key={block.id}
                block={block}
                index={idx}
                totalBlocks={doc.blocks.length}
                userRole={currentRole}
                autoFocus={focusedBlockId === block.id}
                openMenuInitially={menuBlockId === block.id}
                afterList={idx > 0 && ['bullet', 'numbered', 'checklist'].includes(doc.blocks[idx - 1].type)}
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
              {!isReadOnly && ['bullet', 'numbered', 'checklist'].includes(block.type) && doc.blocks[idx + 1]?.type !== 'paragraph' &&
                <EmptyBlockRow listId={block.id} onCreate={openMenu => handleExitList(idx, openMenu)} />}
              </React.Fragment>
            ))}

            {/* Slash Command Dropdown */}
            {slashState.isOpen && (
              <SlashMenu
                query={slashState.query}
                position={slashState.position}
                onSelect={handleSelectSlashItem}
                onApplyColor={handleSlashColor}
                mentions={doc.blocks.flatMap(block => block.properties?.mention ? [block.properties.mention] : [])}
                onClose={() => setSlashState({ isOpen: false, blockId: null, query: '' })}
              />
            )}

            {!isReadOnly &&
              (doc.blocks.length === 0 ||
                (!['bullet', 'numbered', 'checklist'].includes(doc.blocks[doc.blocks.length - 1].type) &&
                  (doc.blocks[doc.blocks.length - 1].type !== 'paragraph' || doc.blocks[doc.blocks.length - 1].content !== ''))) && (
                <div
                  onClick={() => handleAddBlockBelow(doc.blocks.length - 1)}
                  className="group relative flex items-center gap-1 py-1.5 -ml-14 pl-14 pr-2 rounded-xl text-sm text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] cursor-text transition-colors hover:bg-[var(--ui-hover)]/30"
                >
                  <div className="absolute left-1 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="p-1 rounded-lg text-[var(--ui-tertiary)]">
                      <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
                    </span>
                  </div>
                  <span className="select-none text-sm text-[var(--ui-tertiary)]">
                    Gõ nội dung hoặc gõ / để mở tiện ích...
                  </span>
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
              <h3 className="text-sm font-semibold text-[var(--ui-text)]">Hướng dẫn & Phím tắt</h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                aria-label="Đóng"
                title="Đóng"
                className="p-1.5 rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[1.75]" />
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
      {renameOpen && !isReadOnly && <RenameDialog kind="document" initialName={doc.title}
        onClose={() => setRenameOpen(false)} onSave={name => updateDocField('title', name)} />}
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

      {/* Floating Text Selection Format Dialog matching user screenshot */}
      <EditTextDialog
        isOpen={editTextDialog.isOpen}
        position={editTextDialog.position}
        selectedText={editTextDialog.selectedText}
        blockId={editTextDialog.blockId}
        blockType={editTextDialog.blockType}
        authorName={doc.author?.name || 'Việt Cường Vương'}
        updatedTime={doc.updatedAt ? 'Hôm nay lúc 11:30' : 'Hôm nay lúc 11:30'}
        onClose={() => setEditTextDialog((prev) => ({ ...prev, isOpen: false }))}
        onTurnInto={handleTurnIntoBlock}
        onApplyColor={handleApplyColor}
        onCopyLink={handleCopyBlockLink}
        onDuplicate={handleDuplicateBlockOrText}
        onMoveTo={() => setMoveOpen(true)}
        onDelete={handleDeleteSelection}
        onComment={handleCommentSelection}
        onSuggestEdit={handleSuggestEdit}
        onAskAI={handleAskAI}
        onSkillAction={handleSkillAction}
      />
    </div>
  );
};
