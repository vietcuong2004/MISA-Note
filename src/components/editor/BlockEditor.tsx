import { TEMPLATES } from '../../data/mockData';
import { formatDateTime } from '../../utils/dateTime';
import { commandForShortcut } from './slashCommands';
import { recordSlashCommand } from '../../utils/slashHistory';
import { EmptyBlockRow } from './EmptyBlockRow';
import { navigateEditorArrow } from '../../utils/editorArrowNavigation';
import { RenameDialog } from '../modals/RenameDialog';
import { employeeName } from './EmployeePicker';
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  UserPlus,
  MoreHorizontal,
  FolderOpen,
  Download,
  Sparkles,
  Clock,
  Lock,
  Globe,
  Printer,
  X,
  Plus,
  Maximize2,
  Minimize2,
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
import {
  BlockFocusTarget,
  computeBlocksAfterDelete,
  computeBlocksAfterExitListFirstItem,
  computeBlocksAfterMergeWithPrevious,
  focusBlockAtOffset,
} from '../../utils/blockBackspace';
import { extractBlocksFromClipboardData, mergePastedBlocks, replaceSelectedBlocks } from '../../utils/blockClipboard';
import { useMultiBlockSelection } from '../../utils/multiBlockSelection';

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
  autoFocusTitle?: boolean;
  onAutoFocusTitleHandled?: () => void;
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
  autoFocusTitle = false,
  onAutoFocusTitleHandled,
}) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [wideContent, setWideContent] = useState(true);
  const [doc, setDoc] = useState<Document>(document);

  useLayoutEffect(() => {
    const input = titleInputRef.current;
    if (!input) return;
    const resize = () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : undefined;
    if (input.parentElement) observer?.observe(input.parentElement);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [doc.title, wideContent]);

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
    position?: { top: number; left: number; lineTop?: number };
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
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoFocusTitleHandledRef = useRef(onAutoFocusTitleHandled);
  autoFocusTitleHandledRef.current = onAutoFocusTitleHandled;
  const [extraBottomSpace, setExtraBottomSpace] = useState(0);

  useEffect(() => {
    if (!pendingSaveRef.current || pendingSaveRef.current.id !== document.id) {
      setDoc(document);
    }
  }, [document.id, document.folderId, document.space, document.title, document.updatedAt]);

  useEffect(() => {
    setExtraBottomSpace(0);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [document.id]);

  const isReadOnly = currentRole === 'viewer';

  useEffect(() => {
    if (!autoFocusTitle || isReadOnly) return;
    const input = titleInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    autoFocusTitleHandledRef.current?.();
  }, [autoFocusTitle, isReadOnly, document.id]);

  const commitSaveNow = useCallback((updatedDoc: Document) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingSaveRef.current = null;
    saveCallbackRef.current(updatedDoc);
  }, []);

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (pending) {
      saveCallbackRef.current(pending);
    }
  }, []);

  // Commit pending edits before navigating away or refreshing a document URL.
  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingSave);
    return () => {
      window.removeEventListener('beforeunload', flushPendingSave);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback(
    (updatedDoc: Document) => {
      pendingSaveRef.current = updatedDoc;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        pendingSaveRef.current = null;
        saveCallbackRef.current(updatedDoc);
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
  const [focusCursorPosition, setFocusCursorPosition] = useState<'start' | 'end'>('start');
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const pendingBackspaceFocusRef = useRef<BlockFocusTarget | null>(null);

  useLayoutEffect(() => {
    const target = pendingBackspaceFocusRef.current;
    if (!target) return;
    pendingBackspaceFocusRef.current = null;
    focusBlockAtOffset(blocksContainerRef.current, target.blockId, target.offset);
  }, [doc.blocks]);

  const applyBlockFocusResult = (result: { blocks: Block[]; focus: BlockFocusTarget } | null) => {
    if (!result) return;
    const updatedDoc = { ...docRef.current, blocks: result.blocks, updatedAt: new Date().toISOString() };
    docRef.current = updatedDoc;
    pendingBackspaceFocusRef.current = result.focus;
    setDoc(updatedDoc);
    setFocusedBlockId(result.focus.blockId);
    triggerAutoSave(updatedDoc);
  };

  const handleDeleteBlock = (blockId: string) => {
    applyBlockFocusResult(computeBlocksAfterDelete(docRef.current.blocks, blockId));
  };

  const handleMergeWithPrevious = (blockId: string) => {
    applyBlockFocusResult(computeBlocksAfterMergeWithPrevious(docRef.current.blocks, blockId));
  };

  const handleExitListStart = (blockId: string) => {
    applyBlockFocusResult(
      computeBlocksAfterExitListFirstItem(
        docRef.current.blocks,
        blockId,
        () => `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      )
    );
  };

  const {
    selectedBlockIds,
    selectedBlockIdSet,
    clearSelection,
    handleContainerMouseDown,
    handleContainerKeyDownCapture,
    handleContainerCopy,
    handleContainerCut,
  } = useMultiBlockSelection({
    blocks: doc.blocks,
    containerRef: blocksContainerRef,
    resetKey: doc.id,
    canEdit: !isReadOnly,
    isDisabled: slashState.isOpen,
    onToast,
    onFocusBlock: (blockId) => {
      setFocusCursorPosition('start');
      setFocusedBlockId(blockId);
    },
    onReplaceBlocks: (nextBlocks, focusBlockId, caretAtEnd) => {
      const updatedDoc = { ...docRef.current, blocks: nextBlocks, updatedAt: new Date().toISOString() };
      setDoc(updatedDoc);
      setFocusCursorPosition(caretAtEnd ? 'end' : 'start');
      setFocusedBlockId(focusBlockId);
      triggerAutoSave(updatedDoc);
    },
  });
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

  const maybeExpandBottomSpace = useCallback((container: HTMLDivElement) => {
    if (container.scrollHeight <= container.clientHeight) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom > 80) return;
    const maxExtra = Math.max(400, Math.round(container.clientHeight * 0.7));
    const step = Math.max(200, Math.round(container.clientHeight * 0.35));
    setExtraBottomSpace((prev) => (prev >= maxExtra ? prev : Math.min(maxExtra, prev + step)));
  }, []);

  const handleClickBottomWhitespace = () => {
    if (isReadOnly) return;
    const lastBlock = doc.blocks[doc.blocks.length - 1];
    if (lastBlock?.type === 'paragraph' && lastBlock.content === '') {
      setFocusedBlockId(lastBlock.id);
      const textarea = window.document.querySelector<HTMLTextAreaElement>(
        `[data-block-id="${lastBlock.id}"] textarea`
      );
      textarea?.focus();
      return;
    }
    handleAddBlockBelow(doc.blocks.length - 1);
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
        lineTop: rect.top,
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

  const handleInsertTemplate = (templateId: string) => {
    if (isReadOnly || !slashState.blockId) return;
    const template = TEMPLATES.find(item => item.id === templateId);
    const index = doc.blocks.findIndex(block => block.id === slashState.blockId);
    if (!template || index < 0) return;
    const inserted = template.createBlocks().map(original => {
      const block = structuredClone(original);
      block.id = `blk_${crypto.randomUUID()}`;
      if (block.properties?.listItems) block.properties.listItems = block.properties.listItems.map(item => ({ ...item, id: `list_${crypto.randomUUID()}` }));
      if (block.properties?.agenda) block.properties.agenda = block.properties.agenda.map(item => ({ ...item, id: `agenda_${crypto.randomUUID()}` }));
      if (block.properties?.actionItems) block.properties.actionItems = block.properties.actionItems.map(item => ({ ...item, id: `action_${crypto.randomUUID()}` }));
      return block;
    });
    const blankDocument = doc.blocks.every(block => block.id === slashState.blockId || (block.type === 'paragraph' && !block.content.trim()));
    const defaultTitle = ['', 'Ghi chú mới', 'Ghi chú không có tiêu đề', 'Không có tiêu đề'].includes(doc.title.trim());
    const updated = { ...doc,
      title: blankDocument && defaultTitle ? template.title : doc.title,
      type: blankDocument ? template.type : doc.type,
      tags: blankDocument ? [...new Set([...doc.tags, ...template.tags])] : doc.tags,
      blocks: [...doc.blocks.slice(0, index), ...inserted, ...doc.blocks.slice(index + 1)],
      updatedAt: new Date().toISOString(),
    };
    setDoc(updated);
    triggerAutoSave(updated);
    setFocusedBlockId(inserted.find(block => ['paragraph', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'checklist'].includes(block.type))?.id || inserted[0]?.id || null);
    setSlashState({ isOpen: false, blockId: null, query: '' });
    onToast(`Đã chèn mẫu ${template.title}`, 'success');
  };

  const handleSelectSlashItem = (type: BlockType, extraProps?: BlockProperties, targetId = slashState.blockId, preserveText = false) => {
    if (!targetId) return;
    let focusId = targetId;

    const updatedBlocks = doc.blocks.flatMap((b) => {
      if (b.id === targetId) {
        const textType = ['paragraph', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'checklist', 'callout'].includes(type);
        const sourceText = b.properties?.listItems?.map(item => item.content).join('\n') ?? b.content;
        const content = preserveText && textType ? sourceText : '';
        let props: BlockProperties = preserveText && textType ? { textColor: b.properties?.textColor, backgroundColor: b.properties?.backgroundColor, bold: b.properties?.bold, italic: b.properties?.italic, underline: b.properties?.underline, fontFamily: b.properties?.fontFamily, fontSize: b.properties?.fontSize, inlineLinks: b.properties?.inlineLinks } : {};
        if (['bullet', 'numbered', 'checklist'].includes(type)) props = {
          ...props, listItems: preserveText && b.properties?.listItems?.length ? b.properties.listItems : [{ id: `list_${crypto.randomUUID()}`, content, checked: false, inlineLinks: props.inlineLinks }],
        };
        if (type === 'toggle') props = { open: true, caption: '' };
        if (type === 'callout') props = { ...props, calloutType: 'info', calloutIcon: '💡' };
        if (type === 'meeting_info') {
          props = {
            meetingTime: '09:00 - 10:30',
            meetingDate: formatDateTime(new Date()),
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


        const converted: Block = {
          ...b,
          type,
          content: extraProps?.mention ? `@${extraProps.mention.groupName || extraProps.mention.emails.map(employeeName).join(', ')}` : content,
          properties: { ...props, ...extraProps },
        };
        if (preserveText && !textType && sourceText.trim()) {
          focusId = `blk_${crypto.randomUUID()}`;
          return [b, { ...converted, id: focusId }];
        }
        return [converted];
      }
      return b;
    });

    const updatedDoc = { ...doc, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    setFocusedBlockId(focusId);
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
    fontSize?: number;
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
              fontSize: Number.parseFloat(window.getComputedStyle(activeEl).fontSize) || matchedBlock?.properties?.fontSize || 14,
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
            fontSize: Number.parseFloat(window.getComputedStyle(range.startContainer.nodeType === Node.ELEMENT_NODE
              ? range.startContainer as Element : range.startContainer.parentElement!).fontSize) || matchedBlock?.properties?.fontSize || 14,
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

  const handlePrintDocument = () => {
    flushPendingSave();
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      try {
        window.print();
      } catch {
        onToast('Không thể mở hộp thoại in của trình duyệt.', 'error');
      }
    } else {
      onToast('Trình duyệt không hỗ trợ in trực tiếp.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full print:h-auto bg-[var(--ui-surface)] overflow-hidden print:overflow-visible relative">
      {/* Top Header Bar: Breadcrumbs on left, [Xem toàn màn hình] [Chia sẻ] [In] [•••] on right */}
      <div className="no-print h-14 border-b border-[var(--ui-border)] px-8 flex items-center justify-between gap-4 bg-[var(--ui-surface)] sticky top-0 z-30">
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
          <span className="truncate text-[var(--ui-text)] font-semibold">{doc.title || 'Không có tiêu đề'}</span>
        </div>

        {/* Action Buttons Toolbar: [Xem toàn màn hình] [Chia sẻ] [In] [•••] */}
        <div data-doc-header-actions className="flex items-center gap-2 shrink-0">
          <button type="button" aria-label="Xem toàn màn hình" aria-pressed={wideContent}
            onClick={() => setWideContent(previous => !previous)}
            title={wideContent ? 'Thu hẹp nội dung cho dễ đọc' : 'Giãn nội dung theo chiều rộng màn hình'}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-hover)] px-3 py-1.5 text-xs font-medium text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-hover-strong)] cursor-pointer">
            {wideContent ? <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" /> : <Minimize2 aria-hidden="true" className="h-3.5 w-3.5" />}
            <span>{wideContent ? 'Xem toàn màn hình' : 'Vừa đọc'}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] transition-colors ios-interactive shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Chia sẻ</span>
          </button>

          {/* Print / Export PDF Button */}
          <button
            type="button"
            onClick={handlePrintDocument}
            title="In hoặc xuất PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] transition-colors ios-interactive shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>In</span>
          </button>

          {/* More options / utilities button (•••) */}
          <div className="relative">
            <button
              ref={moreButtonRef}
              type="button"
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
              onToggleFavorite={doc.space === 'personal' ? () => {
                onToggleFavorite(doc.id);
                setDoc((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
              } : undefined}
              onShare={() => setShareOpen(true)}
              onRename={!isReadOnly ? () => setRenameOpen(true) : undefined}
              onMove={!isReadOnly ? () => setMoveOpen(true) : undefined}
              onDelete={!isReadOnly ? () => onSoftDeleteDocument(doc.id) : undefined}
            />
          </div>
        </div>
      </div>

      {/* Editor Canvas */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => maybeExpandBottomSpace(e.currentTarget)}
        onWheel={(e) => {
          if (e.deltaY > 0) maybeExpandBottomSpace(e.currentTarget);
        }}
        data-content-width={wideContent ? 'wide' : 'reading'}
        className="flex-1 overflow-y-auto print:overflow-visible px-[5%] print:px-0 pt-10 pb-8 print:py-0"
      >
        <div className={`mx-auto w-full min-w-0 space-y-4 ${wideContent ? '' : 'max-w-2xl print:max-w-none'}`}>
          {/* Document Title matching screenshot */}
          <div>
            <textarea
              ref={titleInputRef}
              rows={1}
              aria-label="Tiêu đề ghi chú"
              data-print-source=""
              disabled={isReadOnly}
              value={doc.title}
              onFocus={clearSelection}
              onChange={(e) => updateDocField('title', e.target.value)}
              onBlur={() => flushPendingSave()}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.key !== 'Enter') return;
                e.preventDefault();
                const nextTitle = e.currentTarget.value.trim();
                if (doc.blocks.length === 0) {
                  const newBlock: Block = {
                    id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    type: 'paragraph',
                    content: '',
                  };
                  const updated = {
                    ...doc,
                    title: nextTitle,
                    blocks: [newBlock],
                    updatedAt: new Date().toISOString(),
                  };
                  setDoc(updated);
                  setFocusedBlockId(newBlock.id);
                  commitSaveNow(updated);
                  return;
                }
                const updated = { ...doc, title: nextTitle, updatedAt: new Date().toISOString() };
                setDoc(updated);
                commitSaveNow(updated);
                const firstBlockId = doc.blocks[0]?.id;
                const firstInput = firstBlockId
                  ? window.document.querySelector<HTMLElement>(
                      `[data-block-id="${firstBlockId}"] textarea, [data-block-id="${firstBlockId}"] input`
                    )
                  : null;
                if (firstInput) {
                  firstInput.focus();
                } else {
                  titleInputRef.current?.blur();
                }
              }}
              placeholder="Tiêu đề trang..."
              className="block w-full resize-none overflow-hidden whitespace-pre-wrap break-words text-3xl md:text-4xl font-bold text-[var(--ui-text)] bg-transparent focus:outline-none placeholder:text-[#C7C7CC] tracking-tight leading-tight print:hidden"
            />
            <div
              data-print-mirror=""
              aria-hidden="true"
              className="hidden print:block w-full whitespace-pre-wrap break-words text-3xl md:text-4xl font-bold text-[var(--ui-text)] tracking-tight leading-tight"
            >
              {doc.title ? (doc.title.endsWith('\n') ? `${doc.title}\u00a0` : doc.title) : '\u00a0'}
            </div>
          </div>

          {/* Blocks container */}
          <div
            id="document-editor-container"
            ref={blocksContainerRef}
            tabIndex={-1}
            data-has-multi-selection={selectedBlockIds.length > 0 ? 'true' : undefined}
            onMouseDown={handleContainerMouseDown}
            onCopy={(event) => handleContainerCopy(event)}
            onCut={handleContainerCut}
            onKeyDownCapture={(event) => {
              if (handleContainerKeyDownCapture(event)) return;
              if (isReadOnly || event.nativeEvent.isComposing || event.getModifierState?.('AltGraph')) return;
              if (!(event.target instanceof HTMLTextAreaElement)) return;
              const command = commandForShortcut(event);
              const blockId = event.target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
              if (!command || !blockId) return;
              event.preventDefault(); event.stopPropagation();
              recordSlashCommand(command.id);
              handleSelectSlashItem(command.type, command.properties, blockId, !slashState.isOpen);
            }}
            onPaste={(event) => {
              const target = event.target;
              const isTextarea = target instanceof HTMLTextAreaElement;
              if (isReadOnly || (!isTextarea && selectedBlockIds.length === 0)) return;
              const blockId = isTextarea ? target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId : undefined;
              const targetBlock = blockId ? doc.blocks.find((item) => item.id === blockId) : undefined;
              if (isTextarea && selectedBlockIds.length === 0 && targetBlock?.type === 'code') return;
              const pastedBlocks = extractBlocksFromClipboardData(event.clipboardData);
              if (!pastedBlocks?.length) return;
              event.preventDefault();
              event.stopPropagation();
              const { blocks: merged, focusBlockId } =
                selectedBlockIds.length > 0
                  ? replaceSelectedBlocks(doc.blocks, selectedBlockIds, pastedBlocks)
                  : mergePastedBlocks(doc.blocks, blockId, pastedBlocks);
              clearSelection();
              const updatedDoc = { ...doc, blocks: merged, updatedAt: new Date().toISOString() };
              setDoc(updatedDoc);
              setFocusCursorPosition('start');
              setFocusedBlockId(focusBlockId);
              triggerAutoSave(updatedDoc);
            }}
            onKeyDown={navigateEditorArrow}
            className="space-y-2 relative min-h-[300px] print:min-h-0 pt-2 focus:outline-none"
          >
            {doc.blocks.map((block, idx) => (
              <React.Fragment key={block.id}>
              <BlockItem
                key={block.id}
                block={block}
                index={idx}
                totalBlocks={doc.blocks.length}
                userRole={currentRole}
                isBlockSelected={selectedBlockIdSet.has(block.id)}
                autoFocus={focusedBlockId === block.id}
                autoFocusPosition={focusedBlockId === block.id ? focusCursorPosition : 'start'}
                openMenuInitially={menuBlockId === block.id}
                afterList={idx > 0 && ['bullet', 'numbered', 'checklist'].includes(doc.blocks[idx - 1].type)}
                isDragging={draggingBlockIndex === idx}
                isDragOver={dragOverBlockIndex === idx && draggingBlockIndex !== idx}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onMergeWithPrevious={handleMergeWithPrevious}
                onExitListStart={handleExitListStart}
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
                <EmptyBlockRow listId={block.id} compact={idx < doc.blocks.length - 1} onCreate={openMenu => handleExitList(idx, openMenu)} />}
              </React.Fragment>
            ))}

            {/* Slash Command Dropdown */}
            {slashState.isOpen && (
              <SlashMenu
                query={slashState.query}
                position={slashState.position}
                onSelect={handleSelectSlashItem}
                onSelectTemplate={handleInsertTemplate}
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
                  className="no-print group relative flex items-center gap-1 py-1.5 -ml-14 pl-14 pr-2 rounded-xl text-sm text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] cursor-text transition-colors hover:bg-[var(--ui-hover)]/30"
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
          <div
            data-editor-bottom-spacer
            onClick={handleClickBottomWhitespace}
            style={{ minHeight: `${120 + extraBottomSpace}px` }}
            className={`w-full ${isReadOnly ? '' : 'cursor-text'}`}
          />
        </div>
      </div>

      {/* Floating help button '?' at bottom right matching screenshot */}
      <div className="no-print fixed bottom-6 right-6 z-30">
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
        updatedTime={formatDateTime(doc.updatedAt)}
        onClose={() => setEditTextDialog((prev) => ({ ...prev, isOpen: false }))}
        onTurnInto={handleTurnIntoBlock}
        onApplyColor={handleApplyColor}
        formatting={{ fontSize: editTextDialog.fontSize, ...doc.blocks.find(block => block.id === editTextDialog.blockId)?.properties }}
        onFormat={patch => {
          if (!editTextDialog.blockId || isReadOnly) return;
          const updatedDoc = { ...doc, blocks: doc.blocks.map(block => block.id === editTextDialog.blockId
            ? { ...block, properties: { ...block.properties, ...patch } } : block), updatedAt: new Date().toISOString() };
          setDoc(updatedDoc);
          triggerAutoSave(updatedDoc);
        }}
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
