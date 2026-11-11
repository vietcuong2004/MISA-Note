import React, { useMemo } from 'react';
import { AudioLines, FileImage, FileText, Play, Paperclip, AtSign } from 'lucide-react';
import { Block } from '../../types';
import { TEMPLATES } from '../../data/mockData';
import { SlashCommand } from './slashCommands';
import { employeeName } from './EmployeePicker';

function PreviewBlock({ block }: { block: Block }) {
  const props = block.properties;
  if (['h1', 'h2', 'h3', 'h4'].includes(block.type)) return <p className={`font-semibold leading-snug ${block.type === 'h1' ? 'text-lg' : block.type === 'h2' ? 'text-base' : 'text-sm'}`}>{block.content}</p>;
  if (['bullet', 'numbered', 'checklist'].includes(block.type)) {
    const items = props?.listItems || [{ id: block.id, content: block.content, checked: props?.checked }];
    return <div className="space-y-1.5">{items.map((item, index) => <div key={item.id} className="flex gap-2" style={{ paddingLeft: `${Math.max(0, (item.level || 1) - 1) * 12}px` }}>
      {block.type === 'checklist' ? <span className={`mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border text-[9px] ${item.checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400'}`}>{item.checked ? '✓' : ''}</span> : <span>{block.type === 'numbered' ? `${index + 1}.` : '•'}</span>}
      <span className={item.checked ? 'text-gray-400 line-through' : ''}>{item.content || 'Nội dung công việc'}</span>
    </div>)}</div>;
  }
  if (block.type === 'table') {
    const data = props?.tableData || { headers: ['Công việc', 'Trạng thái'], rows: [['Lập kế hoạch', 'Đang làm'], ['Hoàn thành', 'Chưa bắt đầu']] };
    return <div className="overflow-hidden rounded border border-gray-200"><table className="w-full table-fixed border-collapse text-[9px]">
      <thead className="bg-gray-100"><tr>{data.headers.map((header, index) => <th key={index} className="border-r border-gray-200 px-1.5 py-1.5 text-left">{header}</th>)}</tr></thead>
      <tbody>{data.rows.slice(0, 4).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="border-r border-t border-gray-200 px-1.5 py-1.5">{cell || '—'}</td>)}</tr>)}</tbody>
    </table></div>;
  }
  if (block.type === 'callout') return <div className="flex gap-2 rounded bg-amber-50 p-3"><span>💡</span><span>{block.content || 'Ghi chú quan trọng cần lưu ý.'}</span></div>;
  if (block.type === 'quote') return <p className="border-l-2 border-gray-400 pl-3 italic">{block.content}</p>;
  if (block.type === 'divider') return <hr className="border-gray-200" />;
  if (block.type === 'meeting_info') return <div className="space-y-1 rounded border border-gray-200 p-2"><p className="font-semibold">Thông tin cuộc họp</p><p>{block.content}</p><p>{props?.meetingDate} · {props?.meetingTime}</p><p>{props?.meetingLocation}</p></div>;
  if (block.type === 'meeting_attendees') return <div className="space-y-1"><p className="font-semibold">{block.content}</p>{props?.attendees?.map(person => <p key={person.name}>• {person.name} — {person.role}</p>)}</div>;
  if (block.type === 'meeting_agenda') return <div className="space-y-1">{props?.agenda?.map(item => <p key={item.id}>• {item.title} ({item.duration})</p>)}</div>;
  if (block.type === 'meeting_action_items') return <div className="space-y-1">{props?.actionItems?.map(item => <p key={item.id}>☐ {item.task} — {item.assignee}</p>)}</div>;
  return <p className="whitespace-pre-wrap leading-relaxed">{block.content || 'Nhập nội dung tại đây…'}</p>;
}

export function SlashCommandPreview({ command }: { command: SlashCommand }) {
  const blocks = useMemo(() => command.templateId ? TEMPLATES.find(template => template.id === command.templateId)?.createBlocks() : undefined, [command.templateId]);
  const media = ['image', 'video', 'audio', 'file'].includes(command.type);
  const MediaIcon = command.type === 'image' ? FileImage : command.type === 'video' ? Play : command.type === 'audio' ? AudioLines : Paperclip;
  const example: Block = { id: 'preview', type: command.type, content: command.type.startsWith('h') ? command.title : 'Nội dung minh họa', properties: command.properties };
  if (['bullet', 'numbered', 'checklist'].includes(command.type)) example.properties = { listItems: [
    { id: 'first', content: 'Chuẩn bị nội dung công việc', checked: command.type === 'checklist' },
    { id: 'second', content: 'Theo dõi tiến độ thực hiện', checked: false },
  ] };
  return <>
    <div data-command-preview-content className="min-h-24 min-w-0 space-y-3 overflow-y-auto rounded-md bg-white p-3 text-[11px] leading-5 text-[#1d1d1f]">
      {blocks ? blocks.map(block => <PreviewBlock key={block.id} block={block} />)
        : command.color ? <p className="rounded-md p-3 text-sm" style={{ color: command.color.target === 'textColor' ? command.color.value || '#1d1d1f' : '#1d1d1f', backgroundColor: command.color.target === 'backgroundColor' ? command.color.value || '#ffffff' : '#ffffff' }}>Nội dung với {command.title.toLowerCase()}</p>
        : command.disabled ? <p className="flex items-center gap-2 text-gray-500"><FileText className="h-5 w-5" />{command.title}<br />Đang phát triển</p>
        : media ? <div className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 ${command.type === 'image' || command.type === 'video' ? 'h-28 flex-col' : ''}`}><MediaIcon className="h-7 w-7 text-gray-400" /><span>{command.type === 'image' ? 'Thêm hình ảnh' : command.type === 'video' ? 'Thêm video' : command.type === 'audio' ? 'Thêm tệp âm thanh' : 'Tài liệu đính kèm.pdf'}</span></div>
        : command.type === 'link' ? <span className="text-blue-600 underline underline-offset-2">Nội dung hiển thị của liên kết</span>
        : command.type === 'utility' ? <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700"><AtSign className="h-3 w-3" />{command.properties?.mention?.groupName || (command.properties?.mention?.emails[0] ? employeeName(command.properties.mention.emails[0]) : command.id === 'mention_group' ? 'Nhóm dự án' : 'Tên nhân viên')}</span>
        : <PreviewBlock block={example} />}
    </div>
    <div className="px-1 pb-1 pt-2"><p className="text-xs font-medium text-white">{command.title}</p>{command.subtitle && <p className="mt-1 text-[11px] leading-4 text-white/70">{command.subtitle}</p>}</div>
  </>;
}
