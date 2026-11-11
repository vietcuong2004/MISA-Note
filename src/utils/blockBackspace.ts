import { Block, BlockProperties, InlineLink } from '../types';

const TEXT_EDITABLE_TYPES = new Set([
  'paragraph',
  'h1',
  'h2',
  'h3',
  'h4',
  'bullet',
  'numbered',
  'checklist',
  'quote',
  'callout',
  'toggle',
  'code',
]);

const MERGEABLE_TEXT_TYPES = new Set(['paragraph', 'h1', 'h2', 'h3', 'h4', 'quote', 'callout']);
const LIST_TYPES = new Set(['bullet', 'numbered', 'checklist']);

export interface BlockFocusTarget {
  blockId: string;
  offset: number;
}

function mergeInlineLinks(
  baseLinks: InlineLink[] | undefined,
  appendedLinks: InlineLink[] | undefined,
  offset: number
): InlineLink[] | undefined {
  const combined = [
    ...(baseLinks || []),
    ...(appendedLinks || []).map((link) => ({
      ...link,
      start: link.start + offset,
      end: link.end + offset,
    })),
  ];
  return combined.length > 0 ? combined : undefined;
}

/** Focus the last enabled textarea inside target block and place the caret at offset. */
export function focusBlockAtOffset(
  container: HTMLElement | null,
  blockId: string,
  offset = Number.MAX_SAFE_INTEGER
): boolean {
  if (!container) return false;
  const blockEl = container.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
  if (!blockEl) return false;
  const textareas = blockEl.querySelectorAll<HTMLTextAreaElement>('textarea:not([disabled])');
  const input = textareas.length > 0 ? textareas[textareas.length - 1] : null;
  if (!input) return false;

  const clamped = Math.max(0, Math.min(offset, input.value.length));
  input.focus();
  try {
    input.setSelectionRange(clamped, clamped);
  } catch {
    // Ignore non-selectable inputs in synthetic environments.
  }
  input.scrollIntoView?.({ block: 'nearest' });
  return true;
}

/** Compute next block array and focus target after deleting a block (e.g. Backspace on empty line). */
export function computeBlocksAfterDelete(
  blocks: Block[],
  blockId: string
): { blocks: Block[]; focus: BlockFocusTarget } | null {
  const idx = blocks.findIndex((block) => block.id === blockId);
  if (idx === -1) return null;

  if (blocks.length <= 1) {
    const only = blocks[0];
    if (only.type === 'paragraph') return null;
    const reset: Block = {
      ...only,
      type: 'paragraph',
      content: '',
      properties: only.properties ? { ...only.properties, checked: undefined, listItems: undefined } : undefined,
    };
    return { blocks: [reset], focus: { blockId: only.id, offset: 0 } };
  }

  const next = blocks.filter((_, index) => index !== idx);
  let target: Block | undefined;
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (TEXT_EDITABLE_TYPES.has(next[i].type)) {
      target = next[i];
      break;
    }
  }
  if (!target) {
    target = idx > 0 ? next[idx - 1] : next[0];
  }

  return {
    blocks: next,
    focus: {
      blockId: target.id,
      offset: idx > 0 ? Number.MAX_SAFE_INTEGER : 0,
    },
  };
}

/** Merge a non-empty text block at cursor offset 0 onto the end of the previous text block. */
export function computeBlocksAfterMergeWithPrevious(
  blocks: Block[],
  blockId: string
): { blocks: Block[]; focus: BlockFocusTarget } | null {
  const idx = blocks.findIndex((block) => block.id === blockId);
  if (idx <= 0) return null;

  const prev = blocks[idx - 1];
  const curr = blocks[idx];

  if (MERGEABLE_TEXT_TYPES.has(prev.type)) {
    const offset = prev.content.length;
    const mergedLinks = mergeInlineLinks(prev.properties?.inlineLinks, curr.properties?.inlineLinks, offset);
    const mergedProps: BlockProperties | undefined =
      prev.properties || mergedLinks
        ? {
            ...prev.properties,
            inlineLinks: mergedLinks,
          }
        : undefined;
    const merged: Block = {
      ...prev,
      content: prev.content + curr.content,
      properties: mergedProps,
    };
    const next = [...blocks];
    next.splice(idx - 1, 2, merged);
    return { blocks: next, focus: { blockId: prev.id, offset } };
  }

  if (LIST_TYPES.has(prev.type)) {
    const prevItems = prev.properties?.listItems?.length
      ? prev.properties.listItems
      : [
          {
            id: `${prev.id}-item`,
            content: prev.content,
            checked: !!prev.properties?.checked,
            inlineLinks: prev.properties?.inlineLinks,
          },
        ];
    const lastIndex = prevItems.length - 1;
    const lastItem = prevItems[lastIndex];
    const offset = lastItem.content.length;
    const updatedLast = {
      ...lastItem,
      content: lastItem.content + curr.content,
      inlineLinks: mergeInlineLinks(lastItem.inlineLinks, curr.properties?.inlineLinks, offset),
    };
    const nextItems = prevItems.map((item, i) => (i === lastIndex ? updatedLast : item));
    const mergedList: Block = {
      ...prev,
      content: nextItems.map((item) => item.content).join('\n'),
      properties: { ...prev.properties, listItems: nextItems },
    };
    const next = [...blocks];
    next.splice(idx - 1, 2, mergedList);
    return { blocks: next, focus: { blockId: prev.id, offset } };
  }

  if (prev.type === 'divider') {
    const next = blocks.filter((_, index) => index !== idx - 1);
    return { blocks: next, focus: { blockId: curr.id, offset: 0 } };
  }

  return null;
}

/** Exit the first item of a list block back into a plain paragraph on Backspace at offset 0. */
export function computeBlocksAfterExitListFirstItem(
  blocks: Block[],
  blockId: string,
  createNewBlockId: () => string
): { blocks: Block[]; focus: BlockFocusTarget } | null {
  const idx = blocks.findIndex((block) => block.id === blockId);
  if (idx === -1) return null;
  const block = blocks[idx];
  if (!LIST_TYPES.has(block.type)) return null;

  const items = block.properties?.listItems?.length
    ? block.properties.listItems
    : [
        {
          id: `${block.id}-item`,
          content: block.content,
          checked: !!block.properties?.checked,
          inlineLinks: block.properties?.inlineLinks,
        },
      ];
  const first = items[0];
  const paragraphProps: BlockProperties | undefined = block.properties
    ? {
        ...block.properties,
        listItems: undefined,
        checked: undefined,
        inlineLinks: first.inlineLinks,
      }
    : first.inlineLinks
      ? { inlineLinks: first.inlineLinks }
      : undefined;

  const exitedParagraph: Block = {
    id: items.length === 1 ? block.id : createNewBlockId(),
    type: 'paragraph',
    content: first.content,
    properties: paragraphProps,
  };

  const next = [...blocks];
  if (items.length === 1) {
    next.splice(idx, 1, exitedParagraph);
  } else {
    const remaining = items.slice(1);
    const updatedList: Block = {
      ...block,
      content: remaining.map((item) => item.content).join('\n'),
      properties: { ...block.properties, listItems: remaining },
    };
    next.splice(idx, 1, exitedParagraph, updatedList);
  }

  return { blocks: next, focus: { blockId: exitedParagraph.id, offset: 0 } };
}
