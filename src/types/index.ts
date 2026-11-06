export type UserRole = 'owner' | 'editor' | 'viewer';

export type DocumentType = 'note' | 'meeting' | 'plan' | 'internal_doc';

export type SpaceType = 'personal' | 'company';

export type BlockType =
  // 1. Văn bản
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  // 2. Danh sách
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'toggle'
  // 3. Chèn
  | 'image'
  | 'file'
  | 'link'
  | 'table'
  // 4. Trình bày
  | 'quote'
  | 'callout'
  | 'divider'
  | 'code'
  // 5. Cuộc họp
  | 'meeting_info'
  | 'meeting_attendees'
  | 'meeting_agenda'
  | 'meeting_action_items';

export interface BlockActionItem {
  id: string;
  task: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface BlockAttendee {
  name: string;
  role: string;
  status: 'present' | 'absent' | 'excused';
}

export interface BlockAgendaItem {
  id: string;
  title: string;
  duration: string;
  speaker: string;
  notes?: string;
}

export interface BlockTableData {
  headers: string[];
  rows: string[][];
}

export interface BlockProperties {
  checked?: boolean; // for checklist
  open?: boolean; // for toggle list
  language?: string; // for code block
  calloutIcon?: string; // for callout block
  calloutType?: 'info' | 'warning' | 'tip' | 'success';
  url?: string; // for link & image
  fileName?: string; // for file attachment
  fileSize?: string;
  caption?: string;
  // Meeting specific properties
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  meetingLink?: string;
  attendees?: BlockAttendee[];
  agenda?: BlockAgendaItem[];
  actionItems?: BlockActionItem[];
  tableData?: BlockTableData;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: BlockProperties;
}

export interface Folder {
  id: string;
  name: string;
  space: SpaceType;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  space: SpaceType;
  folderId: string | null;
  type: DocumentType;
  tags: string[];
  blocks: Block[];
  permission: UserRole;
  isPrivate: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    department?: string;
  };
  isFavorite?: boolean;
  isTrash?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  department: string;
  currentRole: UserRole;
}

export type ViewState =
  | { type: 'document'; documentId: string }
  | { type: 'recent' }
  | { type: 'favorite' }
  | { type: 'meeting_notes' }
  | { type: 'library' }
  | { type: 'trash' }
  | { type: 'folder'; folderId: string };
