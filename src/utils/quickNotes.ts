import { memoryStorage } from './memoryStorage';
import { formatDateTime } from './dateTime';
import { normalizeCommandQuery } from '../components/editor/SlashMenu';
import { employeeName } from '../components/editor/EmployeePicker';
import { Block, BlockProperties, BlockType, QuickNote } from '../types';

export const QUICK_NOTES_STORAGE_KEY = 'ghi_chu_noi_bo_quick_notes_v1';

const vnPartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function getVietnamDateParts(date: Date) {
  const parts = Object.fromEntries(vnPartsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour,
    minute: parts.minute,
  };
}

/** Generate a collision-safe ID for quick notes and blocks. */
export function createQuickNoteId(prefix: 'qn' | 'qblk' | 'qlist' = 'qblk'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a fresh empty block for the quick note editor. */
export function createEmptyQuickNoteBlock(): Block {
  return { id: createQuickNoteId('qblk'), type: 'paragraph', content: '' };
}

/** Read persisted quick notes safely from in-memory storage. */
export function getStoredQuickNotes(): QuickNote[] {
  try {
    const raw = memoryStorage.getItem(QUICK_NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading quick notes from memoryStorage:', error);
    return [];
  }
}

/** Persist quick notes into memoryStorage, throwing on failure so UI preserves dirty edits. */
export function saveStoredQuickNotes(notes: QuickNote[]): QuickNote[] {
  try {
    memoryStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify(notes));
    return notes;
  } catch {
    throw new Error('Không thể lưu ghi chú nhanh. Bộ nhớ tạm có thể đã đầy.');
  }
}

/** Sort quick notes by most recently updated descending. */
export function sortQuickNotes(notes: QuickNote[]): QuickNote[] {
  return [...notes].sort((a, b) => {
    const timeDiff = Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt);
    if (Number.isFinite(timeDiff) && timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

/** Insert or update a single quick note in memoryStorage without mutating callers' state on failure. */
export function upsertQuickNoteInStorage(note: QuickNote): QuickNote[] {
  const current = getStoredQuickNotes();
  const index = current.findIndex((item) => item.id === note.id);
  const nextList = index >= 0
    ? current.map((item, idx) => (idx === index ? note : item))
    : [note, ...current];
  return sortQuickNotes(saveStoredQuickNotes(nextList));
}

/** Remove a quick note by ID from memoryStorage. */
export function deleteQuickNoteInStorage(noteId: string): QuickNote[] {
  const current = getStoredQuickNotes();
  const nextList = current.filter((item) => item.id !== noteId);
  return sortQuickNotes(saveStoredQuickNotes(nextList));
}

function getBlockTextLines(block: Block): string[] {
  if (['bullet', 'numbered', 'checklist'].includes(block.type)) {
    const listItems = block.properties?.listItems?.length
      ? block.properties.listItems
      : [{ id: block.id, content: block.content, checked: !!block.properties?.checked }];
    return listItems
      .map((item, idx) => {
        const text = item.content.trim();
        if (!text) return '';
        if (block.type === 'checklist') return `${item.checked ? '☑' : '☐'} ${text}`;
        if (block.type === 'numbered') return `${idx + 1}. ${text}`;
        return `- ${text}`;
      })
      .filter(Boolean);
  }
  const lines = [block.content, block.properties?.caption || '']
    .flatMap((chunk) => chunk.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean);
  return lines;
}

/** Check whether a quick note or draft contains user-entered title or body content. */
export function hasQuickNoteContent(title: string, blocks: Block[]): boolean {
  if (title.trim().length > 0) return true;
  return blocks.some((block) => {
    if (block.content.trim().length > 0) return true;
    if (block.properties?.caption?.trim()) return true;
    if (block.properties?.url?.trim()) return true;
    if (block.properties?.listItems?.some((item) => item.content.trim().length > 0 || !!item.checked)) {
      return true;
    }
    if (block.properties?.tableData) return true;
    return !['paragraph', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'checklist'].includes(block.type);
  });
}

/** Extract searchable plain text across title and all blocks. */
export function extractQuickNoteSearchText(note: Pick<QuickNote, 'title' | 'blocks'>): string {
  const parts = [note.title];
  for (const block of note.blocks) {
    parts.push(...getBlockTextLines(block));
    if (block.properties?.tableData) {
      parts.push(...block.properties.tableData.headers, ...block.properties.tableData.rows.flat());
    }
  }
  return parts.join(' ').trim();
}

/** Check whether a quick note matches a search query cleanly (Vietnamese accent-insensitive). */
export function matchesQuickNoteQuery(note: Pick<QuickNote, 'title' | 'blocks'>, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const rawHaystack = extractQuickNoteSearchText(note).toLowerCase();
  if (rawHaystack.includes(trimmed.toLowerCase())) return true;
  const normalizedQuery = normalizeCommandQuery(trimmed);
  if (!normalizedQuery) return true;
  return normalizeCommandQuery(rawHaystack).includes(normalizedQuery);
}

/** Resolve visible title for Recent Notes cards and header display. */
export function getQuickNoteDisplayTitle(note: Pick<QuickNote, 'title' | 'blocks'>): string {
  const explicit = note.title.trim();
  if (explicit) return explicit;
  for (const block of note.blocks) {
    if (block.content.trim()) return block.content.trim().split('\n')[0];
    const firstListText = block.properties?.listItems?.find((item) => item.content.trim())?.content.trim();
    if (firstListText) return firstListText;
  }
  return 'Ghi chú mới';
}

/** Build concise 2-line preview text for Recent Notes cards. */
export function getQuickNotePreviewText(note: Pick<QuickNote, 'title' | 'blocks'>): string {
  const allLines = note.blocks.flatMap(getBlockTextLines);
  if (!note.title.trim() && allLines.length > 1) {
    return allLines.slice(1).join('\n');
  }
  return allLines.join('\n') || 'Không có nội dung bổ sung';
}

/** Format recent list timestamp concisely in Asia/Ho_Chi_Minh (HH:mm, Hôm qua, D ThM). */
export function formatQuickNoteTimestamp(value: string | number | Date | null | undefined, nowDate = new Date()): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const target = getVietnamDateParts(date);
  const now = getVietnamDateParts(nowDate);
  const targetDayEpoch = Date.UTC(target.year, target.month - 1, target.day);
  const nowDayEpoch = Date.UTC(now.year, now.month - 1, now.day);
  const dayDiff = Math.round((nowDayEpoch - targetDayEpoch) / (24 * 60 * 60 * 1000));
  if (dayDiff === 0) return `${target.hour}:${target.minute}`;
  if (dayDiff === 1) return 'Hôm qua';
  return `${target.day} Th${target.month}`;
}

/** Convert an existing block to another block type while preserving compatible text/formatting. */
export function convertQuickNoteBlock(
  block: Block,
  targetType: BlockType,
  extraProps?: BlockProperties,
  preserveText = true
): { blocks: Block[]; focusBlockId: string } {
  const textCompatible = ['paragraph', 'h1', 'h2', 'h3', 'h4', 'bullet', 'numbered', 'checklist', 'callout'].includes(targetType);
  const sourceText = block.properties?.listItems?.map((item) => item.content).join('\n') ?? block.content;
  const content = preserveText && textCompatible ? sourceText : '';

  let props: BlockProperties = preserveText && textCompatible
    ? {
        textColor: block.properties?.textColor,
        backgroundColor: block.properties?.backgroundColor,
        bold: block.properties?.bold,
        italic: block.properties?.italic,
        underline: block.properties?.underline,
        fontFamily: block.properties?.fontFamily,
        fontSize: block.properties?.fontSize,
        inlineLinks: block.properties?.inlineLinks,
      }
    : {};

  if (['bullet', 'numbered', 'checklist'].includes(targetType)) {
    const existingList = preserveText && block.properties?.listItems?.length ? block.properties.listItems : null;
    const splitLines = content ? content.split('\n') : [''];
    props = {
      ...props,
      listItems: existingList ?? splitLines.map((line, index) => ({
        id: createQuickNoteId('qlist'),
        content: line,
        checked: false,
        inlineLinks: index === 0 ? props.inlineLinks : undefined,
      })),
    };
  } else if (targetType === 'toggle') {
    props = { open: true, caption: '' };
  } else if (targetType === 'callout') {
    props = { ...props, calloutType: 'info', calloutIcon: '💡' };
  } else if (targetType === 'meeting_info') {
    props = {
      meetingTime: '09:00 - 10:30',
      meetingDate: formatDateTime(new Date()),
      meetingLocation: 'Phòng họp & Google Meet',
      meetingLink: 'https://meet.google.com/xyz',
    };
  } else if (targetType === 'meeting_attendees') {
    props = {
      attendees: [
        { name: 'Việt Cường', role: 'Chủ trì', status: 'present' },
        { name: 'Trần Thị Thu Hà', role: 'Tham dự', status: 'present' },
      ],
    };
  } else if (targetType === 'meeting_agenda') {
    props = {
      agenda: [{ id: createQuickNoteId('qlist'), title: 'Nội dung thảo luận 1', duration: '15 phút', speaker: 'Cả nhóm' }],
    };
  } else if (targetType === 'meeting_action_items') {
    props = {
      actionItems: [{
        id: createQuickNoteId('qlist'),
        task: 'Đầu việc cần làm',
        assignee: 'Việt Cường',
        dueDate: 'Hết tuần',
        completed: false,
        priority: 'medium',
      }],
    };
  } else if (targetType === 'table') {
    props = {
      tableData: {
        headers: ['Hạng mục', 'Mô tả', 'Tiến độ'],
        rows: [
          ['Việc 1', 'Nội dung chi tiết', 'Đang làm'],
          ['Việc 2', 'Nghiệm thu chất lượng', 'Chờ xử lý'],
        ],
      },
    };
  } else if (targetType === 'code') {
    props = { language: 'typescript' };
  }

  const converted: Block = {
    ...block,
    type: targetType,
    content: extraProps?.mention
      ? `@${extraProps.mention.groupName || extraProps.mention.emails.map(employeeName).join(', ')}`
      : content,
    properties: { ...props, ...extraProps },
  };

  if (preserveText && !textCompatible && sourceText.trim()) {
    const newId = createQuickNoteId('qblk');
    return { blocks: [block, { ...converted, id: newId }], focusBlockId: newId };
  }

  return { blocks: [converted], focusBlockId: block.id };
}
