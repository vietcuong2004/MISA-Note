import { BlockProperties, BlockType } from '../../types';

export interface SlashCommand {
  id: string; type: BlockType; title: string; category: string;
  subtitle?: string; shortcut?: string; badge?: string; properties?: BlockProperties;
  disabled?: boolean;
  color?: { target: 'textColor' | 'backgroundColor'; value: string; swatch?: string; border?: string };
}

const colors = [
  { id: 'default', name: 'mặc định', text: '', background: '', swatch: '', border: '' },
  { id: 'gray', name: 'xám', text: '#787774', background: '#F1F1EF', swatch: '#D3D1CB', border: '#9B9A97' },
  { id: 'brown', name: 'nâu', text: '#9F6B53', background: '#F4EEEE', swatch: '#DFBFA8', border: '#9F6B53' },
  { id: 'orange', name: 'cam', text: '#D9730D', background: '#FBECDD', swatch: '#F9C48C', border: '#D9730D' },
  { id: 'yellow', name: 'vàng', text: '#CB912F', background: '#FBF3DB', swatch: '#FCE181', border: '#CB912F' },
  { id: 'green', name: 'xanh lá', text: '#448361', background: '#EDF3EC', swatch: '#B5DFC4', border: '#448361' },
  { id: 'blue', name: 'xanh lam', text: '#337EA9', background: '#E7F3F8', swatch: '#B0DAF0', border: '#337EA9' },
  { id: 'purple', name: 'tím', text: '#9065B0', background: '#F4F0F7', swatch: '#D6BFEB', border: '#9065B0' },
  { id: 'pink', name: 'hồng', text: '#C14C8A', background: '#F9EEF3', swatch: '#F2BBD5', border: '#C14C8A' },
  { id: 'red', name: 'đỏ', text: '#D44C47', background: '#FDEBEC', swatch: '#F7B4B1', border: '#D44C47' },
];

export const SLASH_COMMANDS: SlashCommand[] = [
  {"id": "command_0", "type": "meeting_info", "title": "Ghi chép cuộc họp với AI", "category": "Đang phát triển", "badge": "Đang phát triển", "disabled": true, "properties": {"commandTitle": "Ghi chép cuộc họp với AI"}},
  {"id": "command_2", "type": "paragraph", "title": "Văn bản", "category": "Nội dung cơ bản", "properties": {"commandTitle": "Văn bản"}},
  {"id": "command_3", "type": "h1", "title": "Đề mục 1", "category": "Nội dung cơ bản", "properties": {"commandTitle": "Đề mục 1"}, "shortcut": "#"},
  {"id": "command_4", "type": "h2", "title": "Đề mục 2", "category": "Nội dung cơ bản", "properties": {"commandTitle": "Đề mục 2"}, "shortcut": "##"},
  {"id": "command_5", "type": "h3", "title": "Đề mục 3", "category": "Nội dung cơ bản", "properties": {"commandTitle": "Đề mục 3"}, "shortcut": "###"},
  {"id": "command_6", "type": "h4", "title": "Đề mục 4", "category": "Nội dung cơ bản", "properties": {"commandTitle": "Đề mục 4"}, "shortcut": "####"},
  {"id": "command_7", "type": "bullet", "title": "Danh sách gạch đầu dòng", "category": "Tiện ích", "properties": {"commandTitle": "Danh sách gạch đầu dòng"}, "shortcut": "-"},
  {"id": "command_8", "type": "numbered", "title": "Danh sách đánh số", "category": "Tiện ích", "properties": {"commandTitle": "Danh sách đánh số"}, "shortcut": "1."},
  {"id": "command_9", "type": "checklist", "title": "Danh sách việc cần làm", "category": "Tiện ích", "properties": {"commandTitle": "Danh sách việc cần làm"}, "shortcut": "[]"},
  {"id": "command_12", "type": "callout", "title": "Khung chú thích", "category": "Tiện ích", "properties": {"commandTitle": "Khung chú thích"}},
  {"id": "command_14", "type": "table", "title": "Bảng biểu", "category": "Tiện ích", "properties": {"commandTitle": "Bảng biểu"}},
  {"id": "command_17", "type": "image", "title": "Hình ảnh", "category": "Phương tiện", "properties": {"commandTitle": "Hình ảnh"}},
  {"id": "command_18", "type": "video", "title": "Video", "category": "Phương tiện", "properties": {"commandTitle": "Video"}},
  {"id": "command_19", "type": "audio", "title": "Âm thanh", "category": "Phương tiện", "properties": {"commandTitle": "Âm thanh"}},
  {"id": "command_21", "type": "file", "title": "Tệp", "category": "Phương tiện", "properties": {"commandTitle": "Tệp"}},
  {"id": "command_16", "type": "link", "title": "Liên kết đến trang (URL)", "category": "Phương tiện", "properties": {"commandTitle": "Liên kết đến trang (URL)"}},
  {"id": "command_57", "type": "utility", "title": "Nhắc đến 1 người", "category": "Nội tuyến", "properties": {"commandTitle": "Nhắc đến 1 người", "utilityKind": "Nhắc đến một người"}, "shortcut": "@"},
  {"id": "mention_group", "type": "utility", "title": "Nhắc đến 1 nhóm", "category": "Nội tuyến", "shortcut": "@", "properties": {"commandTitle": "Nhắc đến 1 nhóm", "utilityKind": "Nhắc đến một nhóm"}},
  ...colors.map((color): SlashCommand => ({
    id: `text-color-${color.id}`, type: 'paragraph', category: 'Màu chữ',
    title: color.id === 'default' ? 'Chữ mặc định' : `Chữ màu ${color.name}`,
    color: { target: 'textColor', value: color.text },
  })),
  ...colors.map((color): SlashCommand => ({
    id: `background-color-${color.id}`, type: 'paragraph', category: 'Màu nền',
    title: `Nền ${color.name}`,
    color: { target: 'backgroundColor', value: color.background, swatch: color.swatch, border: color.border },
  })),
];
