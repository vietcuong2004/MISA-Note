import React, { useState, useEffect } from 'react';
import { Document, Folder, SpaceType } from '../types';
import { getFolderAncestors } from './folders';

export type DragItemType = 'folder' | 'document';

export interface DragItem {
  type: DragItemType;
  id: string;
}

export const DND_MIME = {
  FOLDER: 'application/x-folder-id',
  DOCUMENT: 'application/x-doc-id',
  TEXT_FOLDER: 'text/folder-id',
  TEXT_DOC: 'text/doc-id',
  PLAIN: 'text/plain',
} as const;

let activeDragItem: DragItem | null = null;
const listeners = new Set<(item: DragItem | null) => void>();

export function setActiveDrag(item: DragItem | null) {
  activeDragItem = item;
  listeners.forEach((listener) => {
    try {
      listener(item);
    } catch {
      // Ignore listener error
    }
  });
}

export function clearActiveDrag() {
  setActiveDrag(null);
}

export function getActiveDrag(): DragItem | null {
  return activeDragItem;
}

// Global window listeners to auto-reset on dragend or drop anywhere in the document
if (typeof window !== 'undefined') {
  window.addEventListener('dragend', () => {
    clearActiveDrag();
  });
  window.addEventListener('drop', () => {
    clearActiveDrag();
  });
}

/** Check if childId is the same as ancestorId or a descendant of ancestorId */
export function isFolderDescendant(
  childId: string,
  ancestorId: string,
  folders: Folder[]
): boolean {
  if (childId === ancestorId) return true;
  const ancestors = getFolderAncestors(childId, folders);
  return ancestors.some((a) => a.id === ancestorId);
}

/** Check whether a folder can be legally dropped into targetFolderId (prevent circular nesting) */
export function canDropFolderInto(
  draggedFolderId: string,
  targetFolderId: string | null | undefined,
  folders: Folder[]
): boolean {
  if (!targetFolderId) return true;
  if (draggedFolderId === targetFolderId) return false;
  return !isFolderDescendant(targetFolderId, draggedFolderId, folders);
}

/** Set drag data for a folder */
export function setDragFolder(
  event: React.DragEvent | DragEvent,
  folderId: string
): void {
  try {
    event.dataTransfer?.setData(DND_MIME.FOLDER, folderId);
    event.dataTransfer?.setData(DND_MIME.TEXT_FOLDER, folderId);
    event.dataTransfer?.setData(DND_MIME.PLAIN, `folder:${folderId}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  } catch {
    // In restricted test environments dataTransfer might throw
  }
  setActiveDrag({ type: 'folder', id: folderId });
}

/** Set drag data for a document */
export function setDragDocument(
  event: React.DragEvent | DragEvent,
  docId: string
): void {
  try {
    event.dataTransfer?.setData(DND_MIME.DOCUMENT, docId);
    event.dataTransfer?.setData(DND_MIME.TEXT_DOC, docId);
    event.dataTransfer?.setData(DND_MIME.PLAIN, `doc:${docId}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  } catch {
    // In restricted test environments dataTransfer might throw
  }
  setActiveDrag({ type: 'document', id: docId });
}

/** Robustly extract dragged item from drop event */
export function getDragPayload(
  event: React.DragEvent | DragEvent,
  folders?: Folder[],
  documents?: Document[]
): DragItem | null {
  const dt = event.dataTransfer;

  if (dt) {
    // 1. Check folder-specific custom types
    let folderId = dt.getData(DND_MIME.FOLDER) || dt.getData(DND_MIME.TEXT_FOLDER);
    if (folderId) return { type: 'folder', id: folderId };

    // 2. Check document-specific custom types
    let docId = dt.getData(DND_MIME.DOCUMENT) || dt.getData(DND_MIME.TEXT_DOC);
    if (docId) return { type: 'document', id: docId };

    // 3. Check text/plain with prefixes
    const plain = dt.getData(DND_MIME.PLAIN) || '';
    if (plain.startsWith('folder:')) {
      return { type: 'folder', id: plain.replace('folder:', '') };
    }
    if (plain.startsWith('doc:')) {
      return { type: 'document', id: plain.replace('doc:', '') };
    }

    // 4. Plain string matching known folder or document IDs
    if (plain) {
      if (folders && folders.some((f) => f.id === plain)) {
        return { type: 'folder', id: plain };
      }
      if (documents && documents.some((d) => d.id === plain)) {
        return { type: 'document', id: plain };
      }
      // If starts with fld_ or doc_
      if (plain.startsWith('fld_')) {
        return { type: 'folder', id: plain };
      }
      if (plain.startsWith('doc_')) {
        return { type: 'document', id: plain };
      }
    }
  }

  // Fallback to active in-memory drag item
  if (activeDragItem) {
    return activeDragItem;
  }

  return null;
}

/** Determine whether a dragleave event truly left currentTarget rather than moving into a child. */
export function isLeavingDragTarget(event: React.DragEvent<HTMLElement>): boolean {
  const related = event.relatedTarget as Node | null;
  if (related && event.currentTarget.contains(related)) {
    return false;
  }
  if (!related) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (
      (rect.width > 0 || rect.height > 0) &&
      Number.isFinite(event.clientX) &&
      Number.isFinite(event.clientY) &&
      event.clientX >= rect.left &&
      event.clientX < rect.right &&
      event.clientY >= rect.top &&
      event.clientY < rect.bottom
    ) {
      return false;
    }
  }
  return true;
}

/** Hook to listen to global active drag state in any component */
export function useActiveDrag() {
  const [activeItem, setActiveItem] = useState<DragItem | null>(() => activeDragItem);

  useEffect(() => {
    const handler = (item: DragItem | null) => {
      setActiveItem(item);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    activeItem,
    isDragging: !!activeItem,
    isDraggingFolder: activeItem?.type === 'folder',
    isDraggingDocument: activeItem?.type === 'document',
    draggedId: activeItem?.id || null,
  };
}
