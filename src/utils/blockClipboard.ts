import { Block, BlockProperties, BlockType } from '../types';
import { createQuickNoteId } from './quickNotes';

interface MemoryBlockClipboard {
  blocks: Block[];
  plainText: string;
  html: string;
  copiedAt: number;
}

let memoryClipboard: MemoryBlockClipboard | null = null;
const MEMORY_CLIPBOARD_TTL_MS = 5 * 60 * 1000;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeHtmlAttr(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/** Deep clone blocks while issuing fresh unique block and list-item IDs before insertion. */
export function cloneBlocksWithFreshIds(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    const cloned = structuredClone(block);
    cloned.id = createQuickNoteId('qblk');
    if (cloned.properties?.listItems) {
      cloned.properties.listItems = cloned.properties.listItems.map((item) => ({
        ...item,
        id: createQuickNoteId('qlist'),
      }));
    }
    return cloned;
  });
}

function inlineStyleString(props?: BlockProperties): string {
  if (!props) return '';
  const styles: string[] = [];
  if (props.bold) styles.push('font-weight:700');
  if (props.italic) styles.push('font-style:italic');
  if (props.underline) styles.push('text-decoration:underline');
  if (props.textColor) styles.push(`color:${props.textColor}`);
  if (props.backgroundColor) styles.push(`background-color:${props.backgroundColor}`);
  if (props.fontFamily) styles.push(`font-family:${props.fontFamily}`);
  if (props.fontSize) styles.push(`font-size:${props.fontSize}px`);
  return styles.join(';');
}

function renderFormattedTextHtml(text: string, props?: BlockProperties): string {
  const escaped = escapeHtml(text).replace(/\n/g, '<br/>');
  const style = inlineStyleString(props);
  return style ? `<span style="${escapeHtml(style)}">${escaped}</span>` : escaped;
}

/** Convert an array of blocks into clean readable plain text. */
export function blocksToPlainText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type === 'h1') lines.push(`# ${block.content}`);
    else if (block.type === 'h2') lines.push(`## ${block.content}`);
    else if (block.type === 'h3') lines.push(`### ${block.content}`);
    else if (block.type === 'h4') lines.push(`#### ${block.content}`);
    else if (block.type === 'bullet' || block.type === 'numbered' || block.type === 'checklist') {
      const items = block.properties?.listItems?.length
        ? block.properties.listItems
        : [{ id: block.id, content: block.content, checked: !!block.properties?.checked, level: 1 }];
      items.forEach((item, index) => {
        const indent = '  '.repeat(Math.max(0, (item.level || 1) - 1));
        if (block.type === 'checklist') {
          lines.push(`${indent}- [${item.checked ? 'x' : ' '}] ${item.content}`);
        } else if (block.type === 'numbered') {
          lines.push(`${indent}${index + 1}. ${item.content}`);
        } else {
          lines.push(`${indent}- ${item.content}`);
        }
      });
    } else if (block.type === 'quote') {
      lines.push(`> ${block.content}`);
    } else if (block.type === 'callout') {
      lines.push(`${block.properties?.calloutIcon || '💡'} ${block.content}`.trim());
    } else if (block.type === 'divider') {
      lines.push('---');
    } else if (block.type === 'code') {
      lines.push(`\`\`\`${block.properties?.language || ''}\n${block.content}\n\`\`\``);
    } else if (block.type === 'table' && block.properties?.tableData) {
      lines.push(block.properties.tableData.headers.join('\t'));
      for (const row of block.properties.tableData.rows) {
        lines.push(row.join('\t'));
      }
    } else if (block.content.trim()) {
      lines.push(block.content);
    } else {
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}

/** Convert blocks to semantic rich HTML containing an embedded structured payload for MISA Note paste. */
export function blocksToClipboardHtml(blocks: Block[]): string {
  const sanitized = cloneBlocksWithFreshIds(blocks);
  const parts: string[] = [];

  for (const block of sanitized) {
    const props = block.properties;
    const style = inlineStyleString(props);
    const styleAttr = style ? ` style="${escapeHtml(style)}"` : '';

    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3' || block.type === 'h4') {
      parts.push(`<${block.type}${styleAttr}>${escapeHtml(block.content)}</${block.type}>`);
    } else if (block.type === 'bullet' || block.type === 'numbered' || block.type === 'checklist') {
      const items = props?.listItems?.length
        ? props.listItems
        : [{ id: block.id, content: block.content, checked: !!props?.checked, level: 1 }];
      const tag = block.type === 'numbered' ? 'ol' : 'ul';
      const listAttr = block.type === 'checklist' ? ' data-type="checklist"' : '';
      const itemsHtml = items
        .map((item) => {
          const prefix = block.type === 'checklist' ? (item.checked ? '☑ ' : '☐ ') : '';
          return `<li data-level="${item.level || 1}" data-checked="${item.checked ? 'true' : 'false'}">${prefix}${renderFormattedTextHtml(item.content, props)}</li>`;
        })
        .join('');
      parts.push(`<${tag}${listAttr}${styleAttr}>${itemsHtml}</${tag}>`);
    } else if (block.type === 'quote') {
      parts.push(`<blockquote${styleAttr}>${renderFormattedTextHtml(block.content, props)}</blockquote>`);
    } else if (block.type === 'callout') {
      parts.push(`<div data-callout="true"${styleAttr}>${escapeHtml(props?.calloutIcon || '💡')} ${renderFormattedTextHtml(block.content, props)}</div>`);
    } else if (block.type === 'divider') {
      parts.push('<hr/>');
    } else if (block.type === 'code') {
      parts.push(`<pre><code>${escapeHtml(block.content)}</code></pre>`);
    } else if (block.type === 'table' && props?.tableData) {
      const head = props.tableData.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
      const rows = props.tableData.rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('');
      parts.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`);
    } else {
      parts.push(`<p>${renderFormattedTextHtml(block.content, props)}</p>`);
    }
  }

  const payload = escapeHtml(JSON.stringify(sanitized));
  return `<div data-misa-blocks="${payload}">${parts.join('')}</div>`;
}

/** Remember last copied structured blocks locally in case clipboard API only transports plain text. */
export function recordCopiedBlocks(blocks: Block[]): { html: string; plainText: string } {
  const cloned = cloneBlocksWithFreshIds(blocks);
  const plainText = blocksToPlainText(cloned);
  const html = blocksToClipboardHtml(cloned);
  memoryClipboard = { blocks: cloned, plainText, html, copiedAt: Date.now() };
  return { html, plainText };
}

/** Clear local clipboard bridge (useful in tests). */
export function clearCopiedBlocksBridge(): void {
  memoryClipboard = null;
}

function normalizePastedBlockShape(raw: unknown): Block | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<Block>;
  if (typeof candidate.type !== 'string' || typeof candidate.content !== 'string') return null;
  return {
    id: createQuickNoteId('qblk'),
    type: candidate.type as BlockType,
    content: candidate.content,
    ...(candidate.properties ? { properties: structuredClone(candidate.properties) } : {}),
  };
}

function parseRichHtmlFallback(html: string): Block[] | null {
  if (typeof DOMParser === 'undefined') return null;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const root = parsed.body;
  if (!root) return null;

  // Treat external HTML as structured blocks only for semantic tags; MISA blocks use data-misa-blocks.
  const hasFormatting = !!root.querySelector('h1,h2,h3,h4,ul,ol,blockquote,pre,hr,strong,b,em,i,u');
  if (!hasFormatting) return null;

  const result: Block[] = [];
  const extractStyleProps = (el: HTMLElement): BlockProperties => {
    const props: BlockProperties = {};
    const style = el.style;
    if (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600 || el.querySelector('strong,b')) props.bold = true;
    if (style.fontStyle === 'italic' || el.querySelector('em,i')) props.italic = true;
    if (style.textDecoration?.includes('underline') || el.querySelector('u')) props.underline = true;
    if (style.color) props.textColor = style.color;
    if (style.backgroundColor && style.backgroundColor !== 'transparent') props.backgroundColor = style.backgroundColor;
    if (style.fontFamily) props.fontFamily = style.fontFamily;
    if (style.fontSize && /^\d+px$/i.test(style.fontSize)) props.fontSize = Number.parseInt(style.fontSize, 10);
    return props;
  };

  for (const node of Array.from(root.children)) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim();
    const styleProps = extractStyleProps(el);

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      result.push({ id: createQuickNoteId('qblk'), type: tag, content: text, properties: styleProps });
    } else if (tag === 'ul' || tag === 'ol') {
      const isChecklist = el.getAttribute('data-type') === 'checklist' || !!el.querySelector('input[type="checkbox"]');
      const type: BlockType = isChecklist ? 'checklist' : tag === 'ol' ? 'numbered' : 'bullet';
      const items = Array.from(el.querySelectorAll(':scope > li')).map((li) => {
        const liEl = li as HTMLElement;
        const checkbox = liEl.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const liText = (liEl.textContent || '').replace(/^[☑☐]\s*/, '').trim();
        const checked = checkbox ? checkbox.checked : liEl.getAttribute('data-checked') === 'true' || (liEl.textContent || '').trim().startsWith('☑');
        const level = Number(liEl.getAttribute('data-level')) || 1;
        return { id: createQuickNoteId('qlist'), content: liText, checked, level };
      });
      if (items.length) {
        result.push({
          id: createQuickNoteId('qblk'),
          type,
          content: items.map((item) => item.content).join('\n'),
          properties: { ...styleProps, listItems: items },
        });
      }
    } else if (tag === 'blockquote') {
      result.push({ id: createQuickNoteId('qblk'), type: 'quote', content: text, properties: styleProps });
    } else if (tag === 'pre') {
      result.push({ id: createQuickNoteId('qblk'), type: 'code', content: el.textContent || '', properties: { language: 'typescript' } });
    } else if (tag === 'hr') {
      result.push({ id: createQuickNoteId('qblk'), type: 'divider', content: '' });
    } else if (text || Object.keys(styleProps).length > 0) {
      const innerStyled = el.querySelector<HTMLElement>('[style],strong,b,em,i,u');
      const mergedProps = innerStyled ? { ...extractStyleProps(innerStyled), ...styleProps } : styleProps;
      result.push({ id: createQuickNoteId('qblk'), type: 'paragraph', content: text, properties: mergedProps });
    }
  }

  return result.length > 0 ? result : null;
}

/** Extract formatted MISA blocks from ClipboardEvent data (HTML payload, rich HTML, or matching local bridge). */
export function extractBlocksFromClipboardData(clipboardData: DataTransfer | null | undefined): Block[] | null {
  if (!clipboardData) return null;

  const html = clipboardData.getData('text/html');
  if (html) {
    const match = html.match(/data-misa-blocks="([^"]+)"/);
    if (match) {
      try {
        const decoded = unescapeHtmlAttr(match[1]);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          const valid = parsed.map(normalizePastedBlockShape).filter((item): item is Block => !!item);
          if (valid.length > 0) return cloneBlocksWithFreshIds(valid);
        }
      } catch {
        // Ignore malformed custom attribute and try structural HTML / bridge fallback below.
      }
    }

    const richParsed = parseRichHtmlFallback(html);
    if (richParsed) return richParsed;
  }

  const plain = clipboardData.getData('text/plain');
  if (
    memoryClipboard &&
    Date.now() - memoryClipboard.copiedAt < MEMORY_CLIPBOARD_TTL_MS &&
    plain &&
    plain.trim() === memoryClipboard.plainText.trim()
  ) {
    return cloneBlocksWithFreshIds(memoryClipboard.blocks);
  }

  return null;
}

function legacyExecCopyRich(html: string, plainText: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  let copied = false;
  const handleCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData('text/html', html);
    event.clipboardData?.setData('text/plain', plainText);
    copied = true;
  };
  const helper = document.createElement('textarea');
  helper.value = plainText;
  helper.setAttribute('readonly', 'true');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  document.addEventListener('copy', handleCopy);
  try {
    helper.select();
    const ok = document.execCommand('copy');
    return ok || copied;
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', handleCopy);
    document.body.removeChild(helper);
  }
}

/** Copy formatted blocks to system clipboard (rich text/html + text/plain) and local bridge. */
export async function copyBlocksToClipboard(
  blocks: Block[]
): Promise<{ ok: boolean; error?: string; html: string; plainText: string }> {
  const { html, plainText } = recordCopiedBlocks(blocks);

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    if (typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ]);
        return { ok: true, html, plainText };
      } catch (err) {
        // Retry with writeText only when ClipboardItem MIME isn't supported; preserve explicit permission failures.
        const message = err instanceof Error ? err.message : '';
        if (/denied|permission|notallowed/i.test(message)) {
          return { ok: false, error: 'Không thể sao chép do trình duyệt từ chối quyền Clipboard.', html, plainText };
        }
      }
    }

    if (typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(plainText);
        return { ok: true, html, plainText };
      } catch {
        return { ok: false, error: 'Không thể sao chép tự động vào Clipboard.', html, plainText };
      }
    }
  }

  if (legacyExecCopyRich(html, plainText)) {
    return { ok: true, html, plainText };
  }

  // Internal clipboard bridge remains populated so MISA Note -> MISA Note copy/paste works even in restricted environments.
  return { ok: true, html, plainText };
}

/** Collect copyable blocks from a Quick Note, falling back to title if body blocks are empty. */
export function getCopyableQuickNoteBlocks(blocks: Block[], title?: string): Block[] {
  const hasAnyBodyContent = blocks.some((block) => {
    if (block.content.trim()) return true;
    if (block.properties?.listItems?.some((item) => item.content.trim() || item.checked)) return true;
    return ['divider', 'table', 'image', 'file', 'audio', 'video', 'link'].includes(block.type);
  });
  if (hasAnyBodyContent) {
    // Strip trailing empty placeholder paragraphs while preserving deliberate inner structure.
    let end = blocks.length;
    while (end > 1 && blocks[end - 1].type === 'paragraph' && !blocks[end - 1].content.trim()) {
      end -= 1;
    }
    return cloneBlocksWithFreshIds(blocks.slice(0, end));
  }
  if (title?.trim()) {
    return [{ id: createQuickNoteId('qblk'), type: 'paragraph', content: title.trim() }];
  }
  return [];
}

/** Insert formatted pasted blocks at targetBlockId (replacing empty paragraph, otherwise inserting below). */
export function mergePastedBlocks(
  existingBlocks: Block[],
  targetBlockId: string | undefined,
  pastedBlocks: Block[]
): { blocks: Block[]; focusBlockId: string } {
  const cloned = cloneBlocksWithFreshIds(pastedBlocks);
  const targetIndex = targetBlockId ? existingBlocks.findIndex((b) => b.id === targetBlockId) : -1;
  const focusBlockId = cloned[cloned.length - 1]?.id || targetBlockId || existingBlocks[0]?.id || '';

  if (targetIndex === -1) {
    return { blocks: [...existingBlocks, ...cloned], focusBlockId };
  }

  const target = existingBlocks[targetIndex];
  const isEmptyPlainParagraph =
    target.type === 'paragraph' &&
    !target.content.trim() &&
    !target.properties?.textColor &&
    !target.properties?.backgroundColor &&
    !target.properties?.bold &&
    !target.properties?.italic &&
    !target.properties?.underline;

  const next = [...existingBlocks];
  if (isEmptyPlainParagraph) {
    next.splice(targetIndex, 1, ...cloned);
  } else {
    next.splice(targetIndex + 1, 0, ...cloned);
  }
  return { blocks: next, focusBlockId };
}

/** Replace all currently selected block IDs with cloned replacement blocks at the selection start. */
export function replaceSelectedBlocks(
  existingBlocks: Block[],
  selectedIds: string[],
  replacementBlocks: Block[]
): { blocks: Block[]; focusBlockId: string } {
  const selectedSet = new Set(selectedIds);
  const firstSelectedIndex = existingBlocks.findIndex((b) => selectedSet.has(b.id));
  if (firstSelectedIndex === -1) {
    return mergePastedBlocks(existingBlocks, undefined, replacementBlocks);
  }
  const cloned = cloneBlocksWithFreshIds(replacementBlocks);
  const before = existingBlocks.slice(0, firstSelectedIndex).filter((b) => !selectedSet.has(b.id));
  const after = existingBlocks.slice(firstSelectedIndex).filter((b) => !selectedSet.has(b.id));
  const next = [...before, ...cloned, ...after];
  const focusBlockId =
    cloned[cloned.length - 1]?.id || next[Math.min(firstSelectedIndex, Math.max(0, next.length - 1))]?.id || '';
  return { blocks: next, focusBlockId };
}
