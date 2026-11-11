import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Block } from '../types';
import { copyBlocksToClipboard, recordCopiedBlocks } from './blockClipboard';

export interface MultiBlockSelectionOptions {
  blocks: Block[];
  containerRef: React.RefObject<HTMLElement | null>;
  resetKey?: string | null;
  canEdit?: boolean;
  isDisabled?: boolean;
  onReplaceBlocks?: (nextBlocks: Block[], focusBlockId: string, caretAtEnd?: boolean) => void;
  onFocusBlock?: (blockId: string) => void;
  createFallbackBlock?: () => Block;
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

function clearNativeTextSelection() {
  if (typeof window !== 'undefined') {
    window.getSelection()?.removeAllRanges();
  }
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    const pos = active.selectionEnd ?? active.value.length;
    try {
      active.setSelectionRange(pos, pos);
    } catch {
      // Ignore non-selectable input types.
    }
  }
}

function resolveBlockIndexFromEvent(
  container: HTMLElement,
  blocks: Block[],
  target: EventTarget | null,
  clientY?: number
): number {
  const targetEl =
    target && typeof (target as HTMLElement).closest === 'function'
      ? (target as HTMLElement).closest<HTMLElement>('[data-block-id]')
      : null;
  const directBlockId = targetEl && container.contains(targetEl) ? targetEl.dataset.blockId : undefined;

  const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-block-id]'));
  const measured: { idx: number; rect: DOMRect }[] = [];
  for (const el of elements) {
    const id = el.dataset.blockId;
    const idx = id ? blocks.findIndex((b) => b.id === id) : -1;
    if (idx === -1) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 || rect.top !== rect.bottom) {
      measured.push({ idx, rect });
    }
  }

  // Prefer vertical rect geometry first when layout metrics exist so Chromium textarea capture never pins drags to block 1.
  if (typeof clientY === 'number' && measured.length > 0) {
    if (clientY <= measured[0].rect.top) return measured[0].idx;
    for (const item of measured) {
      if (clientY <= item.rect.bottom) return item.idx;
    }
    return measured[measured.length - 1].idx;
  }

  if (directBlockId) {
    const directIdx = blocks.findIndex((b) => b.id === directBlockId);
    if (directIdx !== -1) return directIdx;
  }

  return -1;
}

function isInteractiveControlTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).closest !== 'function') return false;
  return Boolean(
    (target as HTMLElement).closest('button, a, select, input, [role="menu"], [role="listbox"], [draggable="true"]')
  );
}

/** Shared hook enabling multi-block Ctrl+A and mouse-drag selection across separate block textareas. */
export function useMultiBlockSelection({
  blocks,
  containerRef,
  resetKey,
  canEdit = true,
  isDisabled = false,
  onReplaceBlocks,
  onFocusBlock,
  createFallbackBlock,
  onToast,
}: MultiBlockSelectionOptions) {
  const [rawSelectedIds, setRawSelectedIds] = useState<string[]>([]);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const anchorIndexRef = useRef<number | null>(null);

  const selectedBlockIds = useMemo(() => {
    if (rawSelectedIds.length === 0) return rawSelectedIds;
    const validIds = new Set(blocks.map((block) => block.id));
    const filtered = rawSelectedIds.filter((id) => validIds.has(id));
    return filtered.length === rawSelectedIds.length ? rawSelectedIds : filtered;
  }, [blocks, rawSelectedIds]);

  const selectedBlockIdSet = useMemo(() => new Set(selectedBlockIds), [selectedBlockIds]);
  const selectedIdsRef = useRef<string[]>(selectedBlockIds);
  selectedIdsRef.current = selectedBlockIds;
  const blocksRef = useRef<Block[]>(blocks);
  blocksRef.current = blocks;

  const clearSelection = useCallback(() => {
    setRawSelectedIds((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const selectAllBlocks = useCallback(() => {
    const allIds = blocksRef.current.map((block) => block.id);
    if (allIds.length === 0) return;
    anchorIndexRef.current = 0;
    setRawSelectedIds(allIds);
    clearNativeTextSelection();
    containerRef.current?.focus({ preventScroll: true });
  }, [containerRef]);

  useEffect(() => {
    setRawSelectedIds([]);
    anchorIndexRef.current = null;
    dragCleanupRef.current?.();
  }, [resetKey]);

  useEffect(() => {
    if (isDisabled) {
      setRawSelectedIds([]);
      dragCleanupRef.current?.();
    }
  }, [isDisabled]);

  useEffect(() => () => {
    dragCleanupRef.current?.();
  }, []);

  // Clear highlight when user clicks outside editor content (except editor toolbars / menus).
  useEffect(() => {
    if (selectedBlockIds.length === 0 || typeof document === 'undefined') return;
    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !('nodeType' in target)) return;
      if (containerRef.current?.contains(target)) return;
      if (target.closest?.('[role="toolbar"], [role="menu"], [role="listbox"]')) return;
      clearSelection();
    };
    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [clearSelection, containerRef, selectedBlockIds.length]);

  const deleteSelectedBlocks = useCallback(
    (replacementChar?: string) => {
      if (!canEdit || !onReplaceBlocks || selectedIdsRef.current.length === 0) return;
      const currentBlocks = blocksRef.current;
      const selectedSet = new Set(selectedIdsRef.current);
      const firstIdx = currentBlocks.findIndex((block) => selectedSet.has(block.id));
      if (firstIdx === -1) return;

      const before = currentBlocks.slice(0, firstIdx).filter((block) => !selectedSet.has(block.id));
      const after = currentBlocks.slice(firstIdx).filter((block) => !selectedSet.has(block.id));

      if (typeof replacementChar === 'string') {
        const base = createFallbackBlock
          ? createFallbackBlock()
          : { id: `blk_${crypto.randomUUID()}`, type: 'paragraph' as const, content: '' };
        const typedBlock: Block = { ...base, type: 'paragraph', content: replacementChar, properties: undefined };
        clearSelection();
        onReplaceBlocks([...before, typedBlock, ...after], typedBlock.id, true);
        return;
      }

      const remaining = [...before, ...after];
      if (remaining.length === 0) {
        const blank = createFallbackBlock
          ? createFallbackBlock()
          : { id: `blk_${crypto.randomUUID()}`, type: 'paragraph' as const, content: '' };
        clearSelection();
        onReplaceBlocks([blank], blank.id, false);
        return;
      }

      const focusTarget = remaining[Math.min(firstIdx, remaining.length - 1)];
      clearSelection();
      onReplaceBlocks(remaining, focusTarget.id, false);
    },
    [canEdit, clearSelection, createFallbackBlock, onReplaceBlocks]
  );

  const handleContainerMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (isDisabled || event.button !== 0 || !containerRef.current) return;
      if (isInteractiveControlTarget(event.target)) return;

      const container = containerRef.current;
      const currentBlocks = blocksRef.current;
      if (currentBlocks.length === 0) return;

      const clickedIdx = resolveBlockIndexFromEvent(container, currentBlocks, event.target, event.clientY);
      if (clickedIdx === -1) return;

      if (event.shiftKey && anchorIndexRef.current !== null) {
        event.preventDefault();
        const start = Math.min(anchorIndexRef.current, clickedIdx);
        const end = Math.max(anchorIndexRef.current, clickedIdx);
        setRawSelectedIds(currentBlocks.slice(start, end + 1).map((b) => b.id));
        clearNativeTextSelection();
        container.focus({ preventScroll: true });
        return;
      }

      if (selectedIdsRef.current.length > 0) {
        clearSelection();
      }
      anchorIndexRef.current = clickedIdx;

      dragCleanupRef.current?.();
      let isMultiDragging = false;
      const anchorIdx = clickedIdx;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!containerRef.current) return;
        const hoveredIdx = resolveBlockIndexFromEvent(
          containerRef.current,
          blocksRef.current,
          moveEvent.target,
          moveEvent.clientY
        );
        if (hoveredIdx === -1) return;

        if (!isMultiDragging && hoveredIdx === anchorIdx) {
          return;
        }
        isMultiDragging = true;
        moveEvent.preventDefault();
        clearNativeTextSelection();
        const start = Math.min(anchorIdx, hoveredIdx);
        const end = Math.max(anchorIdx, hoveredIdx);
        setRawSelectedIds(blocksRef.current.slice(start, end + 1).map((b) => b.id));
      };

      const cleanup = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (dragCleanupRef.current === cleanup) {
          dragCleanupRef.current = null;
        }
      };

      const handleMouseUp = () => {
        cleanup();
        if (isMultiDragging) {
          clearNativeTextSelection();
          containerRef.current?.focus({ preventScroll: true });
        }
      };

      dragCleanupRef.current = cleanup;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [clearSelection, containerRef, isDisabled]
  );

  const handleContainerKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLElement>): boolean => {
      if (isDisabled || event.nativeEvent.isComposing || event.getModifierState?.('AltGraph')) return false;
      const currentBlocks = blocksRef.current;
      if (currentBlocks.length === 0) return false;

      const isMod = event.ctrlKey || event.metaKey;
      const lowerKey = event.key.toLowerCase();

      // Ctrl+A / Cmd+A selects all blocks in multi-block notes/docs (with code/table cell selecting inner text first).
      if (isMod && !event.altKey && !event.shiftKey && (lowerKey === 'a' || event.code === 'KeyA')) {
        const targetEl = event.target as HTMLElement | null;
        const targetBlockId = targetEl?.closest?.('[data-block-id]')?.getAttribute('data-block-id');
        const targetBlock = targetBlockId ? currentBlocks.find((b) => b.id === targetBlockId) : undefined;
        const isCellOrCode =
          targetBlock?.type === 'code' || targetEl instanceof HTMLInputElement;
        if (
          isCellOrCode &&
          (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement)
        ) {
          const start = event.target.selectionStart ?? 0;
          const end = event.target.selectionEnd ?? 0;
          if (start !== 0 || end !== event.target.value.length) {
            return false;
          }
        }

        if (currentBlocks.length > 1 || !(event.target instanceof HTMLTextAreaElement)) {
          event.preventDefault();
          event.stopPropagation();
          selectAllBlocks();
          return true;
        }
        return false;
      }

      if (selectedIdsRef.current.length === 0) return false;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopPropagation?.();
        const firstId = selectedIdsRef.current[0];
        clearSelection();
        if (firstId) onFocusBlock?.(firstId);
        return true;
      }

      if (isMod && !event.altKey && !event.shiftKey && (lowerKey === 'c' || event.code === 'KeyC')) {
        const selectedSet = new Set(selectedIdsRef.current);
        const selectedBlocks = currentBlocks.filter((b) => selectedSet.has(b.id));
        if (selectedBlocks.length > 0) {
          void copyBlocksToClipboard(selectedBlocks).then((res) => {
            if (!res.ok) {
              onToast?.(res.error || 'Không thể sao chép nội dung.', 'error');
            } else {
              onToast?.('Đã sao chép vùng chọn giữ nguyên định dạng', 'success');
            }
          });
        }
        return true;
      }

      if (isMod && !event.altKey && !event.shiftKey && (lowerKey === 'x' || event.code === 'KeyX')) {
        event.preventDefault();
        event.stopPropagation();
        const selectedSet = new Set(selectedIdsRef.current);
        const selectedBlocks = currentBlocks.filter((b) => selectedSet.has(b.id));
        if (selectedBlocks.length > 0) {
          void copyBlocksToClipboard(selectedBlocks).then((res) => {
            if (!res.ok) onToast?.(res.error || 'Không thể sao chép nội dung.', 'error');
          });
        }
        if (canEdit) deleteSelectedBlocks();
        return true;
      }

      if ((event.key === 'Backspace' || event.key === 'Delete') && !isMod && !event.altKey) {
        if (!canEdit) return false;
        event.preventDefault();
        event.stopPropagation();
        deleteSelectedBlocks();
        return true;
      }

      if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key) && !event.shiftKey && !isMod) {
        const edgeId =
          event.key === 'ArrowUp' || event.key === 'ArrowLeft'
            ? selectedIdsRef.current[0]
            : selectedIdsRef.current[selectedIdsRef.current.length - 1];
        clearSelection();
        if (edgeId) onFocusBlock?.(edgeId);
        return false;
      }

      if (event.key.length === 1 && !isMod && !event.altKey) {
        if (!canEdit || !onReplaceBlocks) return false;
        event.preventDefault();
        event.stopPropagation();
        deleteSelectedBlocks(event.key);
        return true;
      }

      return false;
    },
    [canEdit, clearSelection, deleteSelectedBlocks, isDisabled, onFocusBlock, onReplaceBlocks, onToast, selectAllBlocks]
  );

  const handleContainerCopy = useCallback(
    (event: React.ClipboardEvent<HTMLElement>, fallbackExtract?: () => Block[] | null) => {
      const selectedSet = new Set(selectedIdsRef.current);
      const selectedBlocks =
        selectedSet.size > 0
          ? blocksRef.current.filter((b) => selectedSet.has(b.id))
          : fallbackExtract?.() ?? null;

      if (!selectedBlocks || selectedBlocks.length === 0) return;

      const { html, plainText } = recordCopiedBlocks(selectedBlocks);
      if (event.clipboardData) {
        event.preventDefault();
        event.clipboardData.setData('text/html', html);
        event.clipboardData.setData('text/plain', plainText);
      }
    },
    []
  );

  const handleContainerCut = useCallback(
    (event: React.ClipboardEvent<HTMLElement>) => {
      if (selectedIdsRef.current.length === 0) return;
      handleContainerCopy(event);
      if (canEdit) {
        deleteSelectedBlocks();
      }
    },
    [canEdit, deleteSelectedBlocks, handleContainerCopy]
  );

  return {
    selectedBlockIds,
    selectedBlockIdSet,
    clearSelection,
    selectAllBlocks,
    handleContainerMouseDown,
    handleContainerKeyDownCapture,
    handleContainerCopy,
    handleContainerCut,
  };
}
