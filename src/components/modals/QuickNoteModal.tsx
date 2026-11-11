import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Edit2,
  FileText,
  FolderInput,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Palette,
  Pencil,
  Search,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { Block, BlockProperties, BlockType, QuickNote } from '../../types';
import {
  BlockFocusTarget,
  computeBlocksAfterDelete,
  computeBlocksAfterExitListFirstItem,
  computeBlocksAfterMergeWithPrevious,
  focusBlockAtOffset,
} from '../../utils/blockBackspace';
import {
  copyBlocksToClipboard,
  extractBlocksFromClipboardData,
  getCopyableQuickNoteBlocks,
  mergePastedBlocks,
  replaceSelectedBlocks,
} from '../../utils/blockClipboard';
import { formatDateTime } from '../../utils/dateTime';
import { navigateEditorArrow } from '../../utils/editorArrowNavigation';
import { useMultiBlockSelection } from '../../utils/multiBlockSelection';
import { recordSlashCommand } from '../../utils/slashHistory';
import {
  convertQuickNoteBlock,
  createEmptyQuickNoteBlock,
  createQuickNoteId,
  deleteQuickNoteInStorage,
  formatQuickNoteTimestamp,
  getQuickNoteDisplayTitle,
  getQuickNotePreviewText,
  getStoredQuickNotes,
  hasQuickNoteContent,
  matchesQuickNoteQuery,
  sortQuickNotes,
  upsertQuickNoteInStorage,
} from '../../utils/quickNotes';
import { BlockItem } from '../editor/BlockItem';
import { EmptyBlockRow } from '../editor/EmptyBlockRow';
import { SlashMenu } from '../editor/SlashMenu';
import { commandForShortcut, SLASH_COMMANDS } from '../editor/slashCommands';
import { RenameDialog } from './RenameDialog';

export type QuickNoteViewMode = 'editor' | 'recent';

export interface QuickNoteDraft {
  draftKey: string;
  id: string | null;
  title: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
}

export interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onSaveToWorkspace?: (note: QuickNote) => void;
  loadNotes?: () => Promise<QuickNote[]> | QuickNote[];
  saveNote?: (note: QuickNote) => Promise<QuickNote | void> | QuickNote | void;
  deleteNote?: (noteId: string) => Promise<void> | void;
  searchNotes?: (query: string) => Promise<QuickNote[]> | QuickNote[];
  autosaveDelayMs?: number;
  searchDebounceMs?: number;
}

const HEADING_OPTIONS: { type: BlockType; label: string; preview: string }[] = [
  { type: 'paragraph', label: 'Văn bản', preview: 'Aa' },
  { type: 'h1', label: 'Đề mục 1', preview: 'H1' },
  { type: 'h2', label: 'Đề mục 2', preview: 'H2' },
  { type: 'h3', label: 'Đề mục 3', preview: 'H3' },
  { type: 'h4', label: 'Đề mục 4', preview: 'H4' },
];

const TEXT_COLOR_ITEMS = SLASH_COMMANDS.filter((item) => item.color?.target === 'textColor');
const BG_COLOR_ITEMS = SLASH_COMMANDS.filter((item) => item.color?.target === 'backgroundColor');

function createEmptyDraft(): QuickNoteDraft {
  const now = new Date().toISOString();
  return {
    draftKey: createQuickNoteId('qn'),
    id: null,
    title: '',
    icon: '📝',
    createdAt: now,
    updatedAt: now,
    blocks: [createEmptyQuickNoteBlock()],
  };
}

function draftFromNote(note: QuickNote): QuickNoteDraft {
  return {
    draftKey: note.id,
    id: note.id,
    title: note.title,
    icon: note.icon || '📝',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    blocks: note.blocks.length ? structuredClone(note.blocks) : [createEmptyQuickNoteBlock()],
  };
}

function isThenable<T>(value: unknown): value is Promise<T> {
  return !!value && (typeof value === 'object' || typeof value === 'function') && typeof (value as Promise<T>).then === 'function';
}

function isFormattedQuickNoteBlock(block: Block): boolean {
  if (block.type !== 'paragraph') return true;
  const props = block.properties;
  if (!props) return false;
  return Boolean(
    props.bold ||
      props.italic ||
      props.underline ||
      props.textColor ||
      props.backgroundColor ||
      props.fontFamily ||
      props.fontSize ||
      props.inlineLinks?.length
  );
}

/** Extract selected Quick Note blocks when copying across multiple blocks or within a formatted block. */
function extractSelectedQuickNoteBlocks(
  blocks: Block[],
  target: EventTarget | null,
  container: HTMLElement
): Block[] | null {
  const selection = typeof window !== 'undefined' ? window.getSelection() : null;
  if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const intersecting = Array.from(container.querySelectorAll<HTMLElement>('[data-block-id]'))
      .filter((el) => {
        try {
          return range.intersectsNode(el);
        } catch {
          return false;
        }
      })
      .map((el) => blocks.find((block) => block.id === el.dataset.blockId))
      .filter((block): block is Block => !!block);

    if (intersecting.length >= 2) {
      return intersecting.map((block) => structuredClone(block));
    }
    if (intersecting.length === 1 && !(target instanceof HTMLTextAreaElement)) {
      return isFormattedQuickNoteBlock(intersecting[0]) ? [structuredClone(intersecting[0])] : null;
    }
  }

  if (target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (end <= start) return null;
    const blockId = target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
    const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
    if (!block) return null;

    const isWholeBlock = start === 0 && end === target.value.length;
    if (!isWholeBlock && !isFormattedQuickNoteBlock(block)) return null;

    const cloned = structuredClone(block);
    cloned.content = target.value.slice(start, end);
    if (!isWholeBlock && cloned.properties?.inlineLinks) {
      delete cloned.properties.inlineLinks;
    }
    return [cloned];
  }

  return null;
}

function mergeSavedNoteIntoList(list: QuickNote[], saved: QuickNote): QuickNote[] {
  const exists = list.some((item) => item.id === saved.id);
  const next = exists ? list.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...list];
  return sortQuickNotes(next);
}

const DIALOG_DEFAULT_WIDTH = 460;
const DIALOG_DEFAULT_HEIGHT = 540;
const DIALOG_MARGIN = 16;

function getDialogDimensions(maximized: boolean) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const targetW = maximized ? 820 : DIALOG_DEFAULT_WIDTH;
  const targetH = maximized ? Math.round(vh * 0.82) : DIALOG_DEFAULT_HEIGHT;
  return {
    width: Math.max(280, Math.min(targetW, vw - DIALOG_MARGIN * 2)),
    height: Math.max(320, Math.min(targetH, vh - DIALOG_MARGIN * 2)),
  };
}

function clampDialogPosition(x: number, y: number, width: number, height: number) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const maxX = Math.max(8, vw - width - 8);
  const maxY = Math.max(8, vh - height - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

function getDefaultDialogPosition(width: number, height: number) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return clampDialogPosition(
    Math.round((vw - width) / 2),
    Math.round((vh - height) / 2),
    width,
    height
  );
}

interface QuickNoteMenuActionsProps {
  canRenameOrExport: boolean;
  canCopy: boolean;
  deleteLabel: string;
  onCopyContent: () => void;
  onRename: () => void;
  onSaveToWorkspace?: () => void;
  onDelete: () => void;
}

function QuickNoteMenuItems({
  canRenameOrExport,
  canCopy,
  deleteLabel,
  onCopyContent,
  onRename,
  onSaveToWorkspace,
  onDelete,
}: QuickNoteMenuActionsProps) {
  return (
    <>
      {canCopy && (
        <button
          type="button"
          onClick={onCopyContent}
          className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>Sao chép nội dung</span>
        </button>
      )}
      {canRenameOrExport && (
        <>
          <button
            type="button"
            onClick={onRename}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Đổi tên</span>
          </button>
          {onSaveToWorkspace && (
            <button
              type="button"
              onClick={onSaveToWorkspace}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[var(--ui-hover)] cursor-pointer"
            >
              <FolderInput className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Lưu vào Ghi chép của tôi</span>
            </button>
          )}
        </>
      )}
      {(canCopy || canRenameOrExport) && <div className="my-1 border-t border-[var(--ui-border)]" />}
      <button
        type="button"
        onClick={onDelete}
        className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-600 hover:bg-red-50 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
        <span>{deleteLabel}</span>
      </button>
    </>
  );
}

/** Two-level Quick Note modal (Note Editor & Recent Notes) matching Sticky/Apple Notes UX. */
export const QuickNoteModal: React.FC<QuickNoteModalProps> = ({
  isOpen,
  onClose,
  onToast,
  onSaveToWorkspace,
  loadNotes,
  saveNote,
  deleteNote,
  searchNotes,
  autosaveDelayMs = 350,
  searchDebounceMs = 180,
}) => {
  const [view, setView] = useState<QuickNoteViewMode>('editor');
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuickNoteDraft>(() => createEmptyDraft());
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number }>(() => {
    const dims = getDialogDimensions(false);
    return getDefaultDialogPosition(dims.width, dims.height);
  });

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [focusCursorPosition, setFocusCursorPosition] = useState<'start' | 'end'>('start');
  const [openPopover, setOpenPopover] = useState<'format' | 'color' | 'editorMenu' | null>(null);
  const [listMenuState, setListMenuState] = useState<{ noteId: string; position: { top: number; left: number } } | null>(null);
  const [renamingNote, setRenamingNote] = useState<QuickNote | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [slashState, setSlashState] = useState<{
    isOpen: boolean;
    blockId: string | null;
    query: string;
    position?: { top: number; left: number; lineTop?: number };
  }>({ isOpen: false, blockId: null, query: '' });

  const activeNoteIdRef = useRef<string | null>(activeNoteId);
  activeNoteIdRef.current = activeNoteId;
  const draftRef = useRef<QuickNoteDraft>(draft);
  draftRef.current = draft;
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const viewRef = useRef<QuickNoteViewMode>(view);
  viewRef.current = view;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assignedIdByDraftKeyRef = useRef<Map<string, string>>(new Map());
  const deletedNoteIdsRef = useRef<Set<string>>(new Set());
  const saveSeqByIdRef = useRef<Map<string, number>>(new Map());
  const latestSavedSeqByIdRef = useRef<Map<string, number>>(new Map());
  const inFlightSavesRef = useRef<Set<Promise<boolean>>>(new Set());
  const hasUnflushedEditsRef = useRef(false);
  const loadSeqRef = useRef(0);
  const searchSeqRef = useRef(0);
  const pendingCountRef = useRef(0);
  const wasOpenRef = useRef(false);
  const pendingDomFocusBlockRef = useRef<string | null>(null);
  const pendingBackspaceFocusRef = useRef<BlockFocusTarget | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titlePointerFocusRef = useRef(false);
  const shouldSelectTitleRef = useRef(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const clearAutosaveTimer = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  /** Synchronize editor draft, active note ID, dirty flags, and block focus in one place. */
  const applyEditorDraft = useCallback((nextDraft: QuickNoteDraft) => {
    draftRef.current = nextDraft;
    dirtyRef.current = false;
    hasUnflushedEditsRef.current = false;
    activeNoteIdRef.current = nextDraft.id;
    titlePointerFocusRef.current = false;
    shouldSelectTitleRef.current = false;
    setIsEditingTitle(false);
    setTitleDraft('');
    setDraft(nextDraft);
    setActiveNoteId(nextDraft.id);
    setIsDirty(false);
    setSaveError(null);
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = null;
    }
    setCopiedFeedback(false);
    const firstBlockId = nextDraft.blocks[0]?.id ?? null;
    setFocusCursorPosition('start');
    setActiveBlockId(firstBlockId);
    setFocusedBlockId(firstBlockId);
  }, []);

  const readNotesFromSource = useCallback(() => {
    return loadNotes ? loadNotes() : getStoredQuickNotes();
  }, [loadNotes]);

  const writeNoteToSource = useCallback(
    (note: QuickNote): QuickNote | Promise<QuickNote> => {
      if (saveNote) {
        const result = saveNote(note);
        if (isThenable<QuickNote | void>(result)) {
          return result.then((returned) => returned || note);
        }
        return (result as QuickNote | void) || note;
      }
      upsertQuickNoteInStorage(note);
      return note;
    },
    [saveNote]
  );

  const removeNoteFromSource = useCallback(
    (noteId: string): void | Promise<void> => {
      if (deleteNote) return deleteNote(noteId);
      deleteQuickNoteInStorage(noteId);
    },
    [deleteNote]
  );

  const applySavedNoteResult = useCallback((saved: QuickNote, draftKey: string, seq: number) => {
    const latestDone = latestSavedSeqByIdRef.current.get(saved.id) ?? 0;
    if (seq < latestDone) return;
    latestSavedSeqByIdRef.current.set(saved.id, seq);
    if (deletedNoteIdsRef.current.has(saved.id)) return;

    setNotes((prev) => mergeSavedNoteIntoList(prev, saved));
    if (draftRef.current.draftKey === draftKey) {
      draftRef.current = { ...draftRef.current, id: saved.id };
      setDraft((prev) => (prev.draftKey === draftKey ? { ...prev, id: saved.id } : prev));
      activeNoteIdRef.current = saved.id;
      setActiveNoteId(saved.id);
      const currentLatestSeq = saveSeqByIdRef.current.get(saved.id) ?? 0;
      if (seq >= currentLatestSeq) {
        dirtyRef.current = false;
        setIsDirty(false);
      }
      setSaveError(null);
    }
  }, []);

  /** Persist a draft snapshot safely; never inserts an empty new record when no content exists. */
  const persistSnapshot = useCallback(
    (snapshot: QuickNoteDraft): boolean | Promise<boolean> => {
      const hasContent = hasQuickNoteContent(snapshot.title, snapshot.blocks);
      if (!snapshot.id && !hasContent) {
        if (draftRef.current.draftKey === snapshot.draftKey) {
          dirtyRef.current = false;
          setIsDirty(false);
          setSaveError(null);
        }
        return true;
      }

      let stableId = snapshot.id || assignedIdByDraftKeyRef.current.get(snapshot.draftKey);
      if (!stableId) {
        stableId = createQuickNoteId('qn');
        assignedIdByDraftKeyRef.current.set(snapshot.draftKey, stableId);
      }
      if (deletedNoteIdsRef.current.has(stableId)) return true;

      const notePayload: QuickNote = {
        id: stableId,
        title: snapshot.title,
        icon: snapshot.icon || '📝',
        blocks: snapshot.blocks,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      };

      const nextSeq = (saveSeqByIdRef.current.get(stableId) ?? 0) + 1;
      saveSeqByIdRef.current.set(stableId, nextSeq);

      try {
        hasUnflushedEditsRef.current = false;
        const result = writeNoteToSource(notePayload);
        if (isThenable<QuickNote>(result)) {
          pendingCountRef.current += 1;
          setIsSaving(true);
          const tracked = result
            .then((saved) => {
              applySavedNoteResult(saved || notePayload, snapshot.draftKey, nextSeq);
              return true;
            })
            .catch((error) => {
              const latestRequested = saveSeqByIdRef.current.get(stableId) ?? 0;
              if (nextSeq < latestRequested) return true;
              hasUnflushedEditsRef.current = true;
              const message = error instanceof Error ? error.message : 'Không thể lưu ghi chú nhanh. Vui lòng thử lại.';
              setSaveError(message);
              onToast?.(message, 'error');
              return false;
            })
            .finally(() => {
              pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
              setIsSaving(pendingCountRef.current > 0);
              inFlightSavesRef.current.delete(tracked);
            });
          inFlightSavesRef.current.add(tracked);
          return tracked;
        }
        applySavedNoteResult(result, snapshot.draftKey, nextSeq);
        return true;
      } catch (error) {
        hasUnflushedEditsRef.current = true;
        const message = error instanceof Error ? error.message : 'Không thể lưu ghi chú nhanh. Vui lòng thử lại.';
        setSaveError(message);
        onToast?.(message, 'error');
        return false;
      }
    },
    [applySavedNoteResult, onToast, writeNoteToSource]
  );

  const flushActiveSave = useCallback((): boolean | Promise<boolean> => {
    clearAutosaveTimer();
    if (!hasUnflushedEditsRef.current) {
      if (inFlightSavesRef.current.size > 0) {
        return Promise.all(Array.from(inFlightSavesRef.current)).then((results) => results.every(Boolean));
      }
      return true;
    }
    const result = persistSnapshot(draftRef.current);
    if (isThenable<boolean>(result)) {
      return result;
    }
    if (inFlightSavesRef.current.size > 0) {
      return Promise.all(Array.from(inFlightSavesRef.current)).then((results) => result && results.every(Boolean));
    }
    return result;
  }, [clearAutosaveTimer, persistSnapshot]);

  const scheduleAutoSave = useCallback(
    (updatedDraft: QuickNoteDraft) => {
      draftRef.current = updatedDraft;
      dirtyRef.current = true;
      hasUnflushedEditsRef.current = true;
      setIsDirty(true);
      setSaveError(null);
      clearAutosaveTimer();

      if (!updatedDraft.id && !hasQuickNoteContent(updatedDraft.title, updatedDraft.blocks)) {
        return;
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persistSnapshot(draftRef.current);
      }, autosaveDelayMs);
    },
    [autosaveDelayMs, clearAutosaveTimer, persistSnapshot]
  );

  const initializeNotesOnOpen = useCallback(() => {
    const seq = ++loadSeqRef.current;
    setLoadError(null);

    const hydrateLoadedNotes = (loaded: QuickNote[]) => {
      if (seq !== loadSeqRef.current) return;
      const sorted = sortQuickNotes(loaded);
      setNotes(sorted);
      const currentActiveId = activeNoteIdRef.current;
      const matched = currentActiveId ? sorted.find((item) => item.id === currentActiveId) : undefined;
      applyEditorDraft(matched ? draftFromNote(matched) : createEmptyDraft());
    };

    try {
      const result = readNotesFromSource();
      if (isThenable<QuickNote[]>(result)) {
        applyEditorDraft(createEmptyDraft());
        setIsLoadingNotes(true);
        result
          .then((loaded) => {
            if (seq !== loadSeqRef.current) return;
            const sorted = sortQuickNotes(loaded);
            setNotes(sorted);
            if (!dirtyRef.current && !hasQuickNoteContent(draftRef.current.title, draftRef.current.blocks)) {
              hydrateLoadedNotes(sorted);
            }
          })
          .catch((error) => {
            if (seq !== loadSeqRef.current) return;
            setLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách ghi chú.');
          })
          .finally(() => {
            if (seq === loadSeqRef.current) setIsLoadingNotes(false);
          });
      } else {
        setIsLoadingNotes(false);
        hydrateLoadedNotes(result);
      }
    } catch (error) {
      setIsLoadingNotes(false);
      setLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách ghi chú.');
    }
  }, [applyEditorDraft, readNotesFromSource]);

  // Every time Quick Note opens from closed, always open directly into Level 2 (Note Editor).
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const dims = getDialogDimensions(false);
      setIsMaximized(false);
      setDialogPosition(getDefaultDialogPosition(dims.width, dims.height));
      setView('editor');
      viewRef.current = 'editor';
      setSearchInput('');
      setSearchQuery('');
      setSaveError(null);
      setOpenPopover(null);
      setListMenuState(null);
      setRenamingNote(null);
      setSlashState({ isOpen: false, blockId: null, query: '' });
      initializeNotesOnOpen();
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      clearAutosaveTimer();
      dragCleanupRef.current?.();
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
      }
      setCopiedFeedback(false);
      setIsDraggingDialog(false);
      titlePointerFocusRef.current = false;
      shouldSelectTitleRef.current = false;
      setIsEditingTitle(false);
      setTitleDraft('');
    }
  }, [clearAutosaveTimer, initializeNotesOnOpen, isOpen]);

  useLayoutEffect(() => {
    if (!isEditingTitle || !shouldSelectTitleRef.current) return;
    const input = titleInputRef.current;
    if (!input) return;
    shouldSelectTitleRef.current = false;
    input.select();
  }, [isEditingTitle]);

  // Keep floating dialog reachable inside viewport when window resizes or dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    const syncViewportBounds = () => {
      if (isMaximized) return;
      const dims = getDialogDimensions(false);
      setDialogPosition((prev) => clampDialogPosition(prev.x, prev.y, dims.width, dims.height));
    };
    syncViewportBounds();
    window.addEventListener('resize', syncViewportBounds);
    return () => window.removeEventListener('resize', syncViewportBounds);
  }, [isMaximized, isOpen]);

  useEffect(() => () => {
    clearAutosaveTimer();
    dragCleanupRef.current?.();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
  }, [clearAutosaveTimer]);

  // Ensure toolbar/slash conversions and Backspace transitions restore focus & caret offset cleanly.
  useLayoutEffect(() => {
    if (view !== 'editor' || !isOpen) return;
    const backspaceTarget = pendingBackspaceFocusRef.current;
    if (backspaceTarget) {
      pendingBackspaceFocusRef.current = null;
      pendingDomFocusBlockRef.current = null;
      focusBlockAtOffset(editorBodyRef.current, backspaceTarget.blockId, backspaceTarget.offset);
      return;
    }
    const focusId = pendingDomFocusBlockRef.current;
    if (!focusId) return;
    pendingDomFocusBlockRef.current = null;
    const input = editorBodyRef.current?.querySelector<HTMLTextAreaElement>(`[data-block-id="${focusId}"] textarea`);
    input?.focus();
  }, [draft.blocks, isOpen, view]);

  // Debounce search query and invoke optional async search adapter.
  useEffect(() => {
    if (!isOpen || view !== 'recent') return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchInput.trim()) {
      setSearchQuery('');
      setIsSearching(false);
      return;
    }

    setIsSearching(!!searchNotes);
    searchTimerRef.current = setTimeout(() => {
      const nextQuery = searchInput.trim();
      setSearchQuery(nextQuery);
      if (!searchNotes) {
        setIsSearching(false);
        return;
      }
      const seq = ++searchSeqRef.current;
      try {
        const result = searchNotes(nextQuery);
        if (isThenable<QuickNote[]>(result)) {
          result
            .then((found) => {
              if (seq === searchSeqRef.current) setNotes(sortQuickNotes(found));
            })
            .catch(() => {})
            .finally(() => {
              if (seq === searchSeqRef.current) setIsSearching(false);
            });
        } else {
          setNotes(sortQuickNotes(result));
          setIsSearching(false);
        }
      } catch {
        setIsSearching(false);
      }
    }, searchDebounceMs);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [isOpen, searchDebounceMs, searchInput, searchNotes, view]);

  // Close toolbars/list context menus cleanly on outside mousedown.
  useEffect(() => {
    if (!openPopover && !listMenuState) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target && typeof event.target === 'object' && 'nodeType' in event.target ? (event.target as Node) : null;
      if (openPopover && toolbarRef.current && (!target || !toolbarRef.current.contains(target))) {
        setOpenPopover(null);
      }
      if (listMenuState && listMenuRef.current && (!target || !listMenuRef.current.contains(target))) {
        setListMenuState(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [listMenuState, openPopover]);

  const handleRequestClose = useCallback(async () => {
    setOpenPopover(null);
    setListMenuState(null);
    setSlashState({ isOpen: false, blockId: null, query: '' });
    if (viewRef.current === 'editor' && (dirtyRef.current || inFlightSavesRef.current.size > 0)) {
      const flushResult = flushActiveSave();
      const ok = isThenable<boolean>(flushResult) ? await flushResult : flushResult;
      if (!ok) return;
    }
    onClose();
  }, [flushActiveSave, onClose]);

  // Layered keyboard handling: Ctrl+/ closes after flushing; Escape acts only when Quick Note owns interaction.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === '/' || event.code === 'Slash')) {
        event.preventDefault();
        event.stopPropagation();
        void handleRequestClose();
        return;
      }
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (renamingNote) return;
      if (slashState.isOpen) return;
      const targetNode = event.target && typeof event.target === 'object' && 'nodeType' in event.target ? (event.target as Node) : null;
      const activeEl = document.activeElement && 'nodeType' in document.activeElement ? document.activeElement : null;
      const insideQuickNote = !!(
        dialogRef.current &&
        ((targetNode && dialogRef.current.contains(targetNode)) || (activeEl && dialogRef.current.contains(activeEl)))
      );
      const modalOpenAbove = !!document.querySelector('[aria-modal="true"]');
      const activeInWorkspace = !!(activeEl && activeEl !== document.body && !dialogRef.current?.contains(activeEl));
      if (!insideQuickNote && (modalOpenAbove || activeInWorkspace)) return;
      if (openPopover) {
        event.preventDefault();
        event.stopPropagation();
        setOpenPopover(null);
        return;
      }
      if (listMenuState) {
        event.preventDefault();
        event.stopPropagation();
        setListMenuState(null);
        return;
      }
      if (viewRef.current === 'recent') {
        event.preventDefault();
        event.stopPropagation();
        void handleRequestClose();
      } else if (hasUnflushedEditsRef.current) {
        void flushActiveSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flushActiveSave, handleRequestClose, isOpen, listMenuState, openPopover, renamingNote, slashState.isOpen]);

  const handleHeaderMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || isMaximized) return;
      const interactive = (event.target as HTMLElement | null)?.closest(
        'button, input, textarea, select, a, [role="button"], [data-no-drag]'
      );
      if (interactive) return;

      event.preventDefault();
      dragCleanupRef.current?.();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = dialogPosition.x;
      const originY = dialogPosition.y;
      setIsDraggingDialog(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dims = getDialogDimensions(false);
        const nextPos = clampDialogPosition(
          originX + (moveEvent.clientX - startX),
          originY + (moveEvent.clientY - startY),
          dims.width,
          dims.height
        );
        setDialogPosition(nextPos);
      };

      const cleanup = () => {
        setIsDraggingDialog(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', cleanup);
        dragCleanupRef.current = null;
      };

      dragCleanupRef.current = cleanup;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', cleanup);
    },
    [dialogPosition.x, dialogPosition.y, isMaximized]
  );

  // Keep keyboard focus inside the dialog when switching to Recent Notes so Escape closes Quick Note cleanly.
  useEffect(() => {
    if (isOpen && view === 'recent') {
      dialogRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, view]);

  const handleBackToRecent = async () => {
    setOpenPopover(null);
    setSlashState({ isOpen: false, blockId: null, query: '' });
    if (dirtyRef.current || inFlightSavesRef.current.size > 0) {
      const flushResult = flushActiveSave();
      const ok = isThenable<boolean>(flushResult) ? await flushResult : flushResult;
      if (!ok) return;
    }
    setView('recent');
    viewRef.current = 'recent';
  };

  const handleOpenNoteFromRecent = (note: QuickNote) => {
    clearAutosaveTimer();
    setListMenuState(null);
    setOpenPopover(null);
    setSlashState({ isOpen: false, blockId: null, query: '' });
    applyEditorDraft(draftFromNote(note));
    setView('editor');
    viewRef.current = 'editor';
  };

  const handleCreateNewDraft = () => {
    clearAutosaveTimer();
    setListMenuState(null);
    setOpenPopover(null);
    setSlashState({ isOpen: false, blockId: null, query: '' });
    applyEditorDraft(createEmptyDraft());
    setView('editor');
    viewRef.current = 'editor';
  };

  const handleCopyFormattedNote = useCallback(
    async (sourceBlocks: Block[], sourceTitle?: string) => {
      const copyable = getCopyableQuickNoteBlocks(sourceBlocks, sourceTitle);
      if (copyable.length === 0) {
        onToast?.('Ghi chú chưa có nội dung để sao chép.', 'info');
        return;
      }
      const result = await copyBlocksToClipboard(copyable);
      if (!result.ok) {
        onToast?.(result.error || 'Không thể sao chép nội dung ghi chú.', 'error');
        return;
      }
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
      setCopiedFeedback(true);
      copyFeedbackTimerRef.current = setTimeout(() => {
        setCopiedFeedback(false);
        copyFeedbackTimerRef.current = null;
      }, 1800);
      onToast?.('Đã sao chép nội dung giữ nguyên định dạng', 'success');
    },
    [onToast]
  );

  const handleRenameConfirmed = (target: QuickNote, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    if (draftRef.current.draftKey === target.id || draftRef.current.id === target.id) {
      const nextDraft = { ...draftRef.current, title: trimmed, updatedAt: now };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      const res = persistSnapshot(nextDraft);
      if (!isThenable<boolean>(res) && !res) {
        throw new Error('Không thể lưu tên mới. Vui lòng thử lại.');
      }
      return;
    }
    const updated: QuickNote = { ...target, title: trimmed, updatedAt: now };
    const res = writeNoteToSource(updated);
    if (isThenable<QuickNote>(res)) {
      void res
        .then((saved) => setNotes((prev) => mergeSavedNoteIntoList(prev, saved)))
        .catch((error) => {
          onToast?.(error instanceof Error ? error.message : 'Không thể đổi tên ghi chú.', 'error');
        });
    } else {
      setNotes((prev) => mergeSavedNoteIntoList(prev, res));
    }
  };

  const handleDeleteQuickNote = async (noteId: string | null) => {
    setOpenPopover(null);
    setListMenuState(null);
    clearAutosaveTimer();

    if (!noteId) {
      applyEditorDraft(createEmptyDraft());
      setView('recent');
      viewRef.current = 'recent';
      return;
    }

    deletedNoteIdsRef.current.add(noteId);
    const deletingOpenNote = activeNoteIdRef.current === noteId || draftRef.current.id === noteId;
    if (deletingOpenNote) {
      applyEditorDraft(createEmptyDraft());
      if (viewRef.current === 'editor') {
        setView('recent');
        viewRef.current = 'recent';
      }
    }

    setNotes((prev) => prev.filter((item) => item.id !== noteId));
    try {
      const res = removeNoteFromSource(noteId);
      if (isThenable<void>(res)) await res;
      onToast?.('Đã xóa ghi chú nhanh', 'info');
    } catch (error) {
      deletedNoteIdsRef.current.delete(noteId);
      onToast?.(error instanceof Error ? error.message : 'Không thể xóa ghi chú.', 'error');
      initializeNotesOnOpen();
    }
  };

  const updateDraftAndAutosave = useCallback(
    (updater: (prev: QuickNoteDraft) => QuickNoteDraft) => {
      const next = updater(draftRef.current);
      draftRef.current = next;
      setDraft(next);
      scheduleAutoSave(next);
    },
    [scheduleAutoSave]
  );

  const {
    selectedBlockIds,
    selectedBlockIdSet,
    clearSelection,
    handleContainerMouseDown,
    handleContainerKeyDownCapture,
    handleContainerCopy,
    handleContainerCut,
  } = useMultiBlockSelection({
    blocks: draft.blocks,
    containerRef: blocksContainerRef,
    resetKey: draft.draftKey,
    isDisabled: !isOpen || view !== 'editor' || slashState.isOpen,
    createFallbackBlock: createEmptyQuickNoteBlock,
    onToast,
    onFocusBlock: (blockId) => {
      pendingDomFocusBlockRef.current = blockId;
      setFocusCursorPosition('start');
      setActiveBlockId(blockId);
      setFocusedBlockId(blockId);
    },
    onReplaceBlocks: (nextBlocks, focusBlockId, caretAtEnd) => {
      pendingDomFocusBlockRef.current = focusBlockId;
      setFocusCursorPosition(caretAtEnd ? 'end' : 'start');
      setActiveBlockId(focusBlockId);
      setFocusedBlockId(focusBlockId);
      updateDraftAndAutosave((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        blocks: nextBlocks,
      }));
    },
  });

  const getCopySourceForEditor = useCallback(() => {
    if (selectedBlockIdSet.size > 0) {
      return {
        blocks: draftRef.current.blocks.filter((b) => selectedBlockIdSet.has(b.id)),
        title: undefined,
      };
    }
    return {
      blocks: draftRef.current.blocks,
      title: draftRef.current.title,
    };
  }, [selectedBlockIdSet]);

  const handleEditorCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    handleContainerCopy(event, () =>
      extractSelectedQuickNoteBlocks(draftRef.current.blocks, event.target, event.currentTarget)
    );
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isTextarea = target instanceof HTMLTextAreaElement;
    if (!isTextarea && selectedBlockIds.length === 0) return;

    const blockId = isTextarea ? target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId : undefined;
    const targetBlock = blockId ? draftRef.current.blocks.find((item) => item.id === blockId) : undefined;
    if (isTextarea && selectedBlockIds.length === 0 && targetBlock?.type === 'code') return;

    const pastedBlocks = extractBlocksFromClipboardData(event.clipboardData);
    if (!pastedBlocks || pastedBlocks.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const { blocks: merged, focusBlockId } =
      selectedBlockIds.length > 0
        ? replaceSelectedBlocks(draftRef.current.blocks, selectedBlockIds, pastedBlocks)
        : mergePastedBlocks(draftRef.current.blocks, blockId, pastedBlocks);

    clearSelection();
    pendingDomFocusBlockRef.current = focusBlockId;
    setFocusCursorPosition('start');
    setActiveBlockId(focusBlockId);
    setFocusedBlockId(focusBlockId);
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: merged,
    }));
  };

  // Target block for toolbar buttons: currently focused block, or first block if none focused yet.
  const targetBlock = useMemo(() => {
    if (activeBlockId) {
      const found = draft.blocks.find((block) => block.id === activeBlockId);
      if (found) return found;
    }
    return draft.blocks[0];
  }, [activeBlockId, draft.blocks]);

  const handleToolbarConvertType = (newType: BlockType, toggleOffToParagraph = false) => {
    if (selectedBlockIdSet.size > 0) {
      const selectedBlocks = draftRef.current.blocks.filter((item) => selectedBlockIdSet.has(item.id));
      if (selectedBlocks.length === 0) return;
      const allSameType = toggleOffToParagraph && selectedBlocks.every((item) => item.type === newType);
      const resolvedType = allSameType ? 'paragraph' : newType;
      let lastFocusId = selectedBlocks[0].id;
      updateDraftAndAutosave((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        blocks: prev.blocks.flatMap((item) => {
          if (!selectedBlockIdSet.has(item.id)) return [item];
          const { blocks: replacement, focusBlockId } = convertQuickNoteBlock(item, resolvedType, undefined, true);
          lastFocusId = focusBlockId;
          return replacement;
        }),
      }));
      setActiveBlockId(lastFocusId);
      return;
    }

    const block = targetBlock;
    if (!block) return;
    const resolvedType = toggleOffToParagraph && block.type === newType ? 'paragraph' : newType;
    const { blocks: replacement, focusBlockId } = convertQuickNoteBlock(block, resolvedType, undefined, true);
    pendingDomFocusBlockRef.current = focusBlockId;
    setFocusCursorPosition('start');
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: prev.blocks.flatMap((item) => (item.id === block.id ? replacement : [item])),
    }));
    setActiveBlockId(focusBlockId);
    setFocusedBlockId(focusBlockId);
  };

  const handleToolbarToggleStyle = (styleKey: 'bold' | 'italic' | 'underline') => {
    const targetIds = selectedBlockIdSet.size > 0
      ? selectedBlockIdSet
      : new Set(targetBlock ? [targetBlock.id] : []);
    if (targetIds.size === 0) return;
    const currentBlocks = draftRef.current.blocks.filter((item) => targetIds.has(item.id));
    const shouldEnable = !currentBlocks.every((item) => !!item.properties?.[styleKey]);
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: prev.blocks.map((item) =>
        targetIds.has(item.id)
          ? { ...item, properties: { ...item.properties, [styleKey]: shouldEnable } }
          : item
      ),
    }));
  };

  const handleToolbarColor = (color: string, isBackground: boolean) => {
    const targetIds = selectedBlockIdSet.size > 0
      ? selectedBlockIdSet
      : new Set(targetBlock ? [targetBlock.id] : []);
    if (targetIds.size === 0) return;
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: prev.blocks.map((item) =>
        targetIds.has(item.id)
          ? {
              ...item,
              properties: {
                ...item.properties,
                [isBackground ? 'backgroundColor' : 'textColor']: color || undefined,
              },
            }
          : item
      ),
    }));
    setOpenPopover(null);
  };

  const handleUpdateBlock = (blockId: string, content: string, properties?: BlockProperties) => {
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: prev.blocks.map((block) =>
        block.id === blockId ? { ...block, content, properties: properties ?? block.properties } : block
      ),
    }));
  };

  const applyBackspaceResult = (result: { blocks: Block[]; focus: BlockFocusTarget } | null) => {
    if (!result) return;
    pendingBackspaceFocusRef.current = result.focus;
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: result.blocks,
    }));
    setActiveBlockId(result.focus.blockId);
    setFocusedBlockId(result.focus.blockId);
  };

  const handleDeleteBlock = (blockId: string) => {
    applyBackspaceResult(computeBlocksAfterDelete(draftRef.current.blocks, blockId));
  };

  const handleMergeWithPrevious = (blockId: string) => {
    applyBackspaceResult(computeBlocksAfterMergeWithPrevious(draftRef.current.blocks, blockId));
  };

  const handleExitListStart = (blockId: string) => {
    applyBackspaceResult(
      computeBlocksAfterExitListFirstItem(
        draftRef.current.blocks,
        blockId,
        () => createQuickNoteId('qblk')
      )
    );
  };

  const handleDuplicateBlock = (blockId: string) => {
    const idx = draftRef.current.blocks.findIndex((block) => block.id === blockId);
    if (idx === -1) return;
    const source = draftRef.current.blocks[idx];
    const cloned: Block = { ...structuredClone(source), id: createQuickNoteId('qblk') };
    updateDraftAndAutosave((prev) => {
      const next = [...prev.blocks];
      next.splice(idx + 1, 0, cloned);
      return { ...prev, updatedAt: new Date().toISOString(), blocks: next };
    });
    setActiveBlockId(cloned.id);
    setFocusedBlockId(cloned.id);
  };

  const handleMoveBlock = (blockId: string, delta: -1 | 1) => {
    const idx = draftRef.current.blocks.findIndex((block) => block.id === blockId);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= draftRef.current.blocks.length) return;
    updateDraftAndAutosave((prev) => {
      const next = [...prev.blocks];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return { ...prev, updatedAt: new Date().toISOString(), blocks: next };
    });
  };

  const handleAddBlockBelow = (index: number) => {
    const created = createEmptyQuickNoteBlock();
    updateDraftAndAutosave((prev) => {
      const next = [...prev.blocks];
      next.splice(index + 1, 0, created);
      return { ...prev, updatedAt: new Date().toISOString(), blocks: next };
    });
    setActiveBlockId(created.id);
    setFocusedBlockId(created.id);
  };

  const handleExitList = (index: number) => {
    const nextBlock = draftRef.current.blocks[index + 1];
    if (nextBlock?.type === 'paragraph') {
      const element = editorBodyRef.current?.querySelector<HTMLTextAreaElement>(`[data-block-id="${nextBlock.id}"] textarea`);
      element?.focus();
      setActiveBlockId(nextBlock.id);
      setFocusedBlockId(nextBlock.id);
      return;
    }
    handleAddBlockBelow(index);
  };

  const handleSelectSlashItem = (type: BlockType, extraProps?: BlockProperties, targetId = slashState.blockId, preserveText = false) => {
    if (!targetId) return;
    let nextFocusId = targetId;
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: prev.blocks.flatMap((block) => {
        if (block.id !== targetId) return [block];
        const result = convertQuickNoteBlock(block, type, extraProps, preserveText);
        nextFocusId = result.focusBlockId;
        return result.blocks;
      }),
    }));
    pendingDomFocusBlockRef.current = nextFocusId;
    setActiveBlockId(nextFocusId);
    setFocusedBlockId(nextFocusId);
    setSlashState({ isOpen: false, blockId: null, query: '' });
  };

  const handleSlashColor = (color: string, isBackground: boolean) => {
    if (!slashState.blockId) return;
    const targetId = slashState.blockId;
    updateDraftAndAutosave((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      blocks: prev.blocks.map((block) =>
        block.id === targetId
          ? {
              ...block,
              content: block.content.replace(/^\/[^\n]*/, ''),
              properties: {
                ...block.properties,
                [isBackground ? 'backgroundColor' : 'textColor']: color || undefined,
              },
            }
          : block
      ),
    }));
    setSlashState({ isOpen: false, blockId: null, query: '' });
  };

  const filteredNotes = useMemo(() => {
    const sorted = sortQuickNotes(notes);
    return sorted.filter((note) => matchesQuickNoteQuery(note, searchQuery));
  }, [notes, searchQuery]);

  if (!isOpen) return null;

  const editorHasContent = hasQuickNoteContent(draft.title, draft.blocks);
  const currentTitlePlaceholder = editorHasContent ? getQuickNoteDisplayTitle(draft) : 'Ghi chú mới';
  const menuTargetNote = listMenuState ? notes.find((item) => item.id === listMenuState.noteId) : undefined;
  const activeDraftAsNote: QuickNote | null = draft.id || editorHasContent
    ? {
        id: draft.id || draft.draftKey,
        title: draft.title,
        icon: draft.icon,
        blocks: draft.blocks,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      }
    : null;

  const dialogDims = getDialogDimensions(isMaximized);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const renderedPos = isMaximized
    ? {
        x: Math.max(DIALOG_MARGIN, Math.round((vw - dialogDims.width) / 2)),
        y: Math.max(DIALOG_MARGIN, Math.round((vh - dialogDims.height) / 2)),
      }
    : clampDialogPosition(dialogPosition.x, dialogPosition.y, dialogDims.width, dialogDims.height);

  return (
    <>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label={view === 'recent' ? 'Ghi chú nhanh' : 'Soạn thảo ghi chú nhanh'}
        data-quick-note-modal
        data-quick-note-view={view}
        data-quick-note-dragging={isDraggingDialog ? 'true' : 'false'}
        style={{
          left: `${renderedPos.x}px`,
          top: `${renderedPos.y}px`,
          width: `${dialogDims.width}px`,
          height: `${dialogDims.height}px`,
        }}
        className={`fixed z-[45] bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border-strong)] shadow-2xl overflow-hidden flex flex-col text-[var(--ui-text)] outline-none ${
          isDraggingDialog ? 'transition-none' : 'transition-[max-width,width,height] duration-150'
        } ${
          isMaximized ? 'max-w-[820px]' : 'max-w-[460px]'
        }`}
      >
        {view === 'recent' ? (
          <>
            {/* LEVEL 1 HEADER: Draggable header with Icon + Ghi chú nhanh on left, Tạo mới black pill on right */}
            <div
              data-quick-note-drag-handle
              onMouseDown={handleHeaderMouseDown}
              className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--ui-border)] gap-2 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <StickyNote className="w-4 h-4 stroke-[2]" />
                </span>
                <h2 className="text-sm font-semibold text-[var(--ui-text)] truncate">Ghi chú nhanh</h2>
              </div>
              <button
                type="button"
                onClick={handleCreateNewDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                <Pencil className="w-3.5 h-3.5 stroke-[2]" />
                <span>Tạo mới</span>
              </button>
            </div>

            {/* LEVEL 1 SEARCH */}
            <div className="shrink-0 px-4 pt-3 pb-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[var(--ui-tertiary)] absolute left-3 pointer-events-none stroke-[1.75]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tìm ghi chú..."
                  aria-label="Tìm ghi chú..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl text-[var(--ui-text)] placeholder:text-[var(--ui-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/25 focus:border-[var(--ui-primary)]"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    className="absolute right-2 p-1 rounded-md text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Recent label */}
            <div className="shrink-0 px-4 py-1.5 flex items-center justify-between text-xs font-semibold text-[var(--ui-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Ghi chú gần đây</span>
              </div>
              {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--ui-tertiary)]" />}
            </div>

            {/* Scrollable list */}
            <div
              data-quick-note-list
              className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1.5"
            >
              {loadError && (
                <div role="alert" className="mx-1 my-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center justify-between gap-2">
                  <span>{loadError}</span>
                  <button type="button" onClick={initializeNotesOnOpen} className="font-semibold underline cursor-pointer shrink-0">
                    Thử lại
                  </button>
                </div>
              )}

              {isLoadingNotes ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 text-xs text-[var(--ui-tertiary)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tải ghi chú...</span>
                </div>
              ) : notes.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-tertiary)]">
                    <StickyNote className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <p className="text-xs font-semibold text-[var(--ui-text)]">Chưa có ghi chú nhanh nào</p>
                  <p className="text-[11px] text-[var(--ui-tertiary)]">Nhấn “Tạo mới” để ghi lại nhanh ý tưởng hoặc việc cần làm.</p>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-tertiary)]">
                    <Search className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <p className="text-xs font-semibold text-[var(--ui-text)]">Không tìm thấy ghi chú phù hợp</p>
                  <p className="text-[11px] text-[var(--ui-tertiary)]">Thử từ khóa khác hoặc tạo một ghi chú mới.</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const displayTitle = getQuickNoteDisplayTitle(note);
                  const preview = getQuickNotePreviewText(note);
                  const isSelected = activeNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      data-quick-note-item={note.id}
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => handleOpenNoteFromRecent(note)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenNoteFromRecent(note);
                        }
                      }}
                      className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#EBF5FF] border-blue-200/80'
                          : 'bg-transparent border-transparent hover:bg-[var(--ui-hover)]'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] flex items-center justify-center shrink-0 mt-0.5 text-[var(--ui-text-secondary)]">
                        <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-[var(--ui-text)] truncate">{displayTitle}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-4 text-[var(--ui-muted)] line-clamp-2 whitespace-pre-line break-words">
                          {preview}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 ml-1">
                        <span className="text-[11px] text-[var(--ui-tertiary)] whitespace-nowrap tabular-nums">
                          {formatQuickNoteTimestamp(note.updatedAt || note.createdAt)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Tùy chọn ghi chú ${displayTitle}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            const top = Math.min(rect.bottom + 4, (typeof window !== 'undefined' ? window.innerHeight : 800) - 180);
                            const left = Math.max(8, Math.min(rect.right - 210, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 220));
                            setListMenuState((prev) => (prev?.noteId === note.id ? null : { noteId: note.id, position: { top, left } }));
                          }}
                          className="p-1 rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-border)]/60 transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4 stroke-[1.75]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* LEVEL 1 FIXED FOOTER matching reference design */}
            <button
              type="button"
              onClick={() => void handleRequestClose()}
              className="shrink-0 w-full flex items-center justify-between border-t border-[var(--ui-border)] px-4 py-2.5 text-xs bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] text-[var(--ui-text)] transition-colors cursor-pointer"
            >
              <span>Đóng menu</span>
              <span className="text-[var(--ui-tertiary)]">esc</span>
            </button>
          </>
        ) : (
          <>
            {/* LEVEL 2 HEADER: Draggable header with < (left), centered title, Maximize / Close (right) */}
            <div
              data-quick-note-drag-handle
              onMouseDown={handleHeaderMouseDown}
              className="shrink-0 h-12 px-3 border-b border-[var(--ui-border)] flex items-center justify-between gap-2 bg-[var(--ui-subtle)]/50 cursor-grab active:cursor-grabbing select-none"
            >
              <button
                type="button"
                onClick={() => void handleBackToRecent()}
                aria-label="Quay lại ghi chú gần đây"
                title="Ghi chú gần đây"
                className="w-8 h-8 rounded-lg hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-text)] transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2]" />
              </button>

              <input
                ref={titleInputRef}
                type="text"
                value={isEditingTitle ? titleDraft : draft.title}
                onMouseDown={(event) => {
                  const wasFocused = window.document.activeElement === event.currentTarget;
                  titlePointerFocusRef.current = !wasFocused;
                  if (!wasFocused) {
                    window.addEventListener('mouseup', () => {
                      queueMicrotask(() => {
                        titlePointerFocusRef.current = false;
                      });
                    }, { once: true });
                  }
                }}
                onMouseUp={(event) => {
                  if (!titlePointerFocusRef.current) return;
                  titlePointerFocusRef.current = false;
                  event.preventDefault();
                  event.currentTarget.select();
                }}
                onClick={(event) => {
                  if (window.document.activeElement !== event.currentTarget) {
                    event.currentTarget.focus();
                  }
                }}
                onFocus={() => {
                  clearSelection();
                  const nextDraftTitle = draft.title || (editorHasContent ? getQuickNoteDisplayTitle(draft) : '');
                  shouldSelectTitleRef.current = true;
                  setTitleDraft(nextDraftTitle);
                  setIsEditingTitle(true);
                }}
                onBlur={() => {
                  titlePointerFocusRef.current = false;
                  shouldSelectTitleRef.current = false;
                  setIsEditingTitle(false);
                }}
                onChange={(event) => {
                  const title = event.target.value;
                  if (isEditingTitle) setTitleDraft(title);
                  updateDraftAndAutosave((prev) => ({ ...prev, title, updatedAt: new Date().toISOString() }));
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.key !== 'Enter') return;
                  event.preventDefault();
                  const firstId = draft.blocks[0]?.id;
                  if (firstId) {
                    const input = editorBodyRef.current?.querySelector<HTMLElement>(`[data-block-id="${firstId}"] textarea`);
                    input?.focus();
                    setActiveBlockId(firstId);
                  } else {
                    event.currentTarget.blur();
                  }
                }}
                placeholder={isEditingTitle ? 'Nhập tên ghi chú...' : currentTitlePlaceholder}
                aria-label="Tiêu đề ghi chú nhanh"
                className={`flex-1 min-w-0 select-text cursor-text text-center text-sm font-semibold text-[var(--ui-text)] bg-transparent focus:outline-none truncate px-2 py-1 rounded-md focus:bg-[var(--ui-surface)] focus:ring-1 focus:ring-[var(--ui-border)] ${
                  !isEditingTitle && editorHasContent ? 'placeholder:text-[var(--ui-text)]' : 'placeholder:text-[var(--ui-tertiary)]'
                }`}
              />

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  aria-label={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
                  title={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
                  className="w-8 h-8 rounded-lg text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4 stroke-[1.75]" /> : <Maximize2 className="w-4 h-4 stroke-[1.75]" />}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRequestClose()}
                  aria-label="Đóng ghi chú nhanh"
                  title="Đóng"
                  className="w-8 h-8 rounded-lg text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[1.75]" />
                </button>
              </div>
            </div>

            {/* LEVEL 2 TOOLBAR */}
            <div
              ref={toolbarRef}
              role="toolbar"
              aria-label="Thanh công cụ định dạng"
              className="shrink-0 px-3 py-1.5 border-b border-[var(--ui-border)] flex items-center justify-between gap-2 bg-[var(--ui-surface)] relative"
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Định dạng văn bản"
                  aria-expanded={openPopover === 'format'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setOpenPopover((prev) => (prev === 'format' ? null : 'format'))}
                  className={`inline-flex items-center gap-0.5 h-8 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    openPopover === 'format'
                      ? 'bg-[var(--ui-hover)] text-[var(--ui-accent)]'
                      : 'text-[var(--ui-accent)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  <span>Aa</span>
                  <ChevronDown className="w-3 h-3 stroke-[2]" />
                </button>

                <span aria-hidden="true" className="h-4 w-px bg-[var(--ui-border)] mx-0.5" />

                <button
                  type="button"
                  aria-label="Danh sách việc cần làm"
                  aria-pressed={targetBlock?.type === 'checklist'}
                  title="Danh sách việc cần làm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToolbarConvertType('checklist', true)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    targetBlock?.type === 'checklist'
                      ? 'bg-[#EBF5FF] text-[var(--ui-accent)]'
                      : 'text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 stroke-[1.75]" />
                </button>

                <button
                  type="button"
                  aria-label="Danh sách đánh số"
                  aria-pressed={targetBlock?.type === 'numbered'}
                  title="Danh sách đánh số"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToolbarConvertType('numbered', true)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    targetBlock?.type === 'numbered'
                      ? 'bg-[#EBF5FF] text-[var(--ui-accent)]'
                      : 'text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 stroke-[1.75]" />
                </button>

                <button
                  type="button"
                  aria-label="Danh sách dấu chấm"
                  aria-pressed={targetBlock?.type === 'bullet'}
                  title="Danh sách dấu chấm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToolbarConvertType('bullet', true)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    targetBlock?.type === 'bullet'
                      ? 'bg-[#EBF5FF] text-[var(--ui-accent)]'
                      : 'text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  <List className="w-4 h-4 stroke-[1.75]" />
                </button>

                <button
                  type="button"
                  aria-label="Màu chữ và màu nền"
                  aria-expanded={openPopover === 'color'}
                  title="Màu chữ và màu nền"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setOpenPopover((prev) => (prev === 'color' ? null : 'color'))}
                  className={`inline-flex items-center gap-0.5 h-8 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    openPopover === 'color'
                      ? 'bg-[var(--ui-hover)] text-[var(--ui-text)]'
                      : 'text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  <Palette className="w-4 h-4 stroke-[1.75]" />
                  <ChevronDown className="w-3 h-3 stroke-[2]" />
                </button>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="Sao chép nội dung"
                  title={copiedFeedback ? 'Đã sao chép định dạng' : 'Sao chép nội dung giữ nguyên định dạng'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const source = getCopySourceForEditor();
                    void handleCopyFormattedNote(source.blocks, source.title);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    copiedFeedback
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  {copiedFeedback ? <Check className="w-4 h-4 stroke-[2]" /> : <Copy className="w-4 h-4 stroke-[1.75]" />}
                </button>
                <button
                  type="button"
                  aria-label="Tùy chọn ghi chú"
                  aria-expanded={openPopover === 'editorMenu'}
                  onClick={() => setOpenPopover((prev) => (prev === 'editorMenu' ? null : 'editorMenu'))}
                  className="w-8 h-8 rounded-lg text-[var(--ui-text)] hover:bg-[var(--ui-hover)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 stroke-[1.75]" />
                </button>
              </div>

              {openPopover === 'format' && (
                <div className="absolute left-3 top-10 z-50 w-56 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2 shadow-xl text-xs">
                  <div className="flex items-center gap-1 pb-2 mb-2 border-b border-[var(--ui-border)]">
                    {([
                      { key: 'bold', label: 'Đậm', mark: 'B', cls: 'font-bold' },
                      { key: 'italic', label: 'Nghiêng', mark: 'I', cls: 'italic' },
                      { key: 'underline', label: 'Gạch chân', mark: 'U', cls: 'underline' },
                    ] as const).map((item) => {
                      const active = !!targetBlock?.properties?.[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          aria-label={item.label}
                          aria-pressed={active}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleToolbarToggleStyle(item.key)}
                          className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${item.cls} ${
                            active ? 'bg-[#EBF5FF] text-[var(--ui-accent)]' : 'bg-[var(--ui-hover)] hover:bg-[var(--ui-hover-strong)]'
                          }`}
                        >
                          {item.mark}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-0.5">
                    {HEADING_OPTIONS.map((option) => {
                      const isCurrent = targetBlock?.type === option.type;
                      return (
                        <button
                          key={option.type}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            handleToolbarConvertType(option.type);
                            setOpenPopover(null);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isCurrent ? 'bg-[#EBF5FF] text-[var(--ui-accent)] font-semibold' : 'hover:bg-[var(--ui-hover)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-[11px]">{option.preview}</span>
                            <span>{option.label}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {openPopover === 'color' && (
                <div className="absolute left-36 top-10 z-50 w-56 max-h-72 overflow-y-auto rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2 shadow-xl text-xs space-y-2">
                  <div>
                    <p className="px-2 py-1 text-[10px] font-bold text-[var(--ui-tertiary)] uppercase">Màu chữ</p>
                    <div className="space-y-0.5">
                      {TEXT_COLOR_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleToolbarColor(item.color?.value || '', false)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left cursor-pointer"
                        >
                          <span
                            aria-hidden="true"
                            className="w-4 h-4 rounded border border-[var(--ui-border)] flex items-center justify-center text-[11px] font-semibold"
                            style={{ color: item.color?.value || 'var(--ui-text)' }}
                          >
                            A
                          </span>
                          <span>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1 border-t border-[var(--ui-border)]">
                    <p className="px-2 py-1 text-[10px] font-bold text-[var(--ui-tertiary)] uppercase">Màu nền</p>
                    <div className="space-y-0.5">
                      {BG_COLOR_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleToolbarColor(item.color?.value || '', true)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--ui-hover)] text-left cursor-pointer"
                        >
                          <span
                            aria-hidden="true"
                            className="w-4 h-4 rounded border"
                            style={{
                              backgroundColor: item.color?.swatch || item.color?.value || 'transparent',
                              borderColor: item.color?.border || 'var(--ui-border)',
                            }}
                          />
                          <span>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {openPopover === 'editorMenu' && (
                <div role="menu" aria-label="Tùy chọn ghi chú nhanh" className="absolute right-3 top-10 z-50 w-52 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] py-1.5 shadow-xl text-xs">
                  <QuickNoteMenuItems
                    canRenameOrExport={!!activeDraftAsNote}
                    canCopy={!!activeDraftAsNote}
                    deleteLabel={draft.id ? 'Xóa ghi chú' : 'Hủy bản nháp'}
                    onCopyContent={() => {
                      setOpenPopover(null);
                      const source = getCopySourceForEditor();
                      void handleCopyFormattedNote(source.blocks, source.title);
                    }}
                    onRename={() => {
                      setOpenPopover(null);
                      if (activeDraftAsNote) setRenamingNote(activeDraftAsNote);
                    }}
                    onSaveToWorkspace={
                      onSaveToWorkspace && activeDraftAsNote
                        ? () => {
                            setOpenPopover(null);
                            onSaveToWorkspace(activeDraftAsNote);
                          }
                        : undefined
                    }
                    onDelete={() => void handleDeleteQuickNote(draft.id)}
                  />
                </div>
              )}
            </div>

            {saveError && (
              <div role="alert" className="shrink-0 mx-[5%] mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center justify-between gap-2">
                <span>{saveError}</span>
                <button
                  type="button"
                  onClick={() => void persistSnapshot(draftRef.current)}
                  className="font-semibold underline shrink-0 cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* LEVEL 2 EDITOR BODY */}
            <div
              key={draft.draftKey}
              ref={editorBodyRef}
              data-quick-note-editor-body
              onFocusCapture={(event) => {
                const blockEl = (event.target as HTMLElement).closest<HTMLElement>('[data-block-id]');
                if (blockEl?.dataset.blockId) {
                  setActiveBlockId(blockEl.dataset.blockId);
                }
              }}
              className="flex-1 min-h-0 overflow-y-auto px-[5%] pt-3 pb-6"
            >
              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--ui-tertiary)] mb-3 select-none">
                <span>{formatDateTime(draft.updatedAt || draft.createdAt)}</span>
                {isSaving && (
                  <span className="inline-flex items-center gap-1 text-[var(--ui-muted)]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang lưu...</span>
                  </span>
                )}
                {!isSaving && draft.id && !isDirty && !saveError && (
                  <span className="inline-flex items-center gap-0.5 text-[var(--ui-muted)]">
                    <Check className="w-3 h-3" />
                    <span>Đã lưu</span>
                  </span>
                )}
              </div>

              <div
                ref={blocksContainerRef}
                tabIndex={-1}
                data-has-multi-selection={selectedBlockIds.length > 0 ? 'true' : undefined}
                onMouseDown={handleContainerMouseDown}
                onCopy={handleEditorCopy}
                onCut={handleContainerCut}
                onPaste={handleEditorPaste}
                onKeyDownCapture={(event) => {
                  if (handleContainerKeyDownCapture(event)) return;
                  if (event.nativeEvent.isComposing || event.getModifierState?.('AltGraph')) return;
                  if (!(event.target instanceof HTMLTextAreaElement)) return;
                  const command = commandForShortcut(event);
                  const blockId = event.target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
                  if (!command || !blockId) return;
                  event.preventDefault();
                  event.stopPropagation();
                  recordSlashCommand(command.id);
                  handleSelectSlashItem(command.type, command.properties, blockId, !slashState.isOpen);
                }}
                onKeyDown={navigateEditorArrow}
                className="space-y-1 relative min-h-[200px] focus:outline-none"
              >
                {draft.blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    <BlockItem
                      block={block}
                      index={index}
                      totalBlocks={draft.blocks.length}
                      userRole="owner"
                      compactGutter={true}
                      isBlockSelected={selectedBlockIdSet.has(block.id)}
                      autoFocus={focusedBlockId === block.id}
                      autoFocusPosition={focusedBlockId === block.id ? focusCursorPosition : 'start'}
                      afterList={index > 0 && ['bullet', 'numbered', 'checklist'].includes(draft.blocks[index - 1].type)}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                      onMergeWithPrevious={handleMergeWithPrevious}
                      onExitListStart={handleExitListStart}
                      onDuplicate={handleDuplicateBlock}
                      onMoveUp={(id) => handleMoveBlock(id, -1)}
                      onMoveDown={(id) => handleMoveBlock(id, 1)}
                      onAddBelow={handleAddBlockBelow}
                      onTriggerSlash={(blockId, query, rect) => {
                        if (!rect) {
                          setSlashState({ isOpen: false, blockId: null, query: '' });
                          return;
                        }
                        setSlashState({
                          isOpen: true,
                          blockId,
                          query,
                          position: { top: rect.bottom + 6, left: rect.left, lineTop: rect.top },
                        });
                      }}
                    />
                    {['bullet', 'numbered', 'checklist'].includes(block.type) &&
                      draft.blocks[index + 1]?.type !== 'paragraph' && (
                        <EmptyBlockRow listId={block.id} compact={index < draft.blocks.length - 1} onCreate={() => handleExitList(index)} />
                      )}
                  </React.Fragment>
                ))}

                {slashState.isOpen && (
                  <SlashMenu
                    query={slashState.query}
                    position={slashState.position}
                    onSelect={handleSelectSlashItem}
                    onApplyColor={handleSlashColor}
                    onClose={() => setSlashState({ isOpen: false, blockId: null, query: '' })}
                  />
                )}
              </div>

              <div
                data-quick-note-bottom-spacer
                onClick={() => {
                  const last = draft.blocks[draft.blocks.length - 1];
                  if (last?.type === 'paragraph' && last.content === '') {
                    const el = editorBodyRef.current?.querySelector<HTMLTextAreaElement>(`[data-block-id="${last.id}"] textarea`);
                    el?.focus();
                    setActiveBlockId(last.id);
                    return;
                  }
                  handleAddBlockBelow(draft.blocks.length - 1);
                }}
                className="min-h-[110px] cursor-text"
              />
            </div>
          </>
        )}
      </div>

      {/* Context menu for Recent Notes item (...) */}
      {listMenuState && menuTargetNote && (
        <div
          ref={listMenuRef}
          role="menu"
          aria-label={`Menu thao tác ${getQuickNoteDisplayTitle(menuTargetNote)}`}
          style={{ top: `${listMenuState.position.top}px`, left: `${listMenuState.position.left}px` }}
          className="fixed z-50 w-52 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] py-1.5 shadow-2xl text-xs text-[var(--ui-text)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <QuickNoteMenuItems
            canRenameOrExport={true}
            canCopy={true}
            deleteLabel="Xóa"
            onCopyContent={() => {
              setListMenuState(null);
              void handleCopyFormattedNote(menuTargetNote.blocks, menuTargetNote.title);
            }}
            onRename={() => {
              setListMenuState(null);
              setRenamingNote(menuTargetNote);
            }}
            onSaveToWorkspace={
              onSaveToWorkspace
                ? () => {
                    setListMenuState(null);
                    onSaveToWorkspace(menuTargetNote);
                  }
                : undefined
            }
            onDelete={() => void handleDeleteQuickNote(menuTargetNote.id)}
          />
        </div>
      )}

      {renamingNote && (
        <RenameDialog
          kind="document"
          initialName={renamingNote.title || getQuickNoteDisplayTitle(renamingNote)}
          onSave={(newName) => handleRenameConfirmed(renamingNote, newName)}
          onClose={() => setRenamingNote(null)}
        />
      )}
    </>
  );
};
