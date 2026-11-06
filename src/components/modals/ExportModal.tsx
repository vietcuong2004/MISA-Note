import React, { useState } from 'react';
import { X, Download, Copy, Printer, Check, FileText } from 'lucide-react';
import { Document } from '../../types';

interface ExportModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  document,
  isOpen,
  onClose,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = (): string => {
    let md = `# ${document.title}\n\n`;
    md += `*Loại tài liệu: ${document.type} | Không gian: ${document.space === 'personal' ? 'Cá nhân' : 'Công ty'}*\n`;
    if (document.tags.length > 0) {
      md += `*Thẻ: ${document.tags.join(', ')}*\n`;
    }
    md += `*Thời gian cập nhật: ${new Date(document.updatedAt).toLocaleString('vi-VN')}*\n\n---\n\n`;

    document.blocks.forEach((block) => {
      switch (block.type) {
        case 'h1':
          md += `# ${block.content}\n\n`;
          break;
        case 'h2':
          md += `## ${block.content}\n\n`;
          break;
        case 'h3':
          md += `### ${block.content}\n\n`;
          break;
        case 'bullet':
          md += `- ${block.content}\n`;
          break;
        case 'numbered':
          md += `1. ${block.content}\n`;
          break;
        case 'checklist':
          md += `- [${block.properties?.checked ? 'x' : ' '}] ${block.content}\n`;
          break;
        case 'toggle':
          md += `<details><summary>${block.content}</summary>\n\n${block.properties?.caption || ''}\n</details>\n\n`;
          break;
        case 'quote':
          md += `> ${block.content}\n\n`;
          break;
        case 'callout':
          md += `> 💡 **Chú thích:** ${block.content}\n\n`;
          break;
        case 'divider':
          md += `---\n\n`;
          break;
        case 'code':
          md += `\`\`\`${block.properties?.language || ''}\n${block.content}\n\`\`\`\n\n`;
          break;
        case 'meeting_info':
          md += `### 📅 Thông tin cuộc họp\n`;
          md += `- **Thời gian:** ${block.properties?.meetingDate || ''} ${block.properties?.meetingTime || ''}\n`;
          md += `- **Địa điểm:** ${block.properties?.meetingLocation || ''}\n`;
          if (block.properties?.meetingLink) md += `- **Link họp:** ${block.properties.meetingLink}\n`;
          md += `\n`;
          break;
        case 'meeting_attendees':
          md += `### 👥 Thành phần tham dự\n`;
          block.properties?.attendees?.forEach((a) => {
            md += `- **${a.name}** (${a.role}): ${a.status === 'present' ? 'Có mặt' : a.status === 'absent' ? 'Vắng mặt' : 'Có phép'}\n`;
          });
          md += `\n`;
          break;
        case 'meeting_agenda':
          md += `### 📋 Chương trình cuộc họp\n`;
          block.properties?.agenda?.forEach((ag) => {
            md += `- **${ag.title}** (${ag.duration} - ${ag.speaker}): ${ag.notes || ''}\n`;
          });
          md += `\n`;
          break;
        case 'meeting_action_items':
          md += `### ✅ Việc cần làm (Action Items)\n`;
          block.properties?.actionItems?.forEach((item) => {
            md += `- [${item.completed ? 'x' : ' '}] **${item.task}** | Phụ trách: ${item.assignee} | Hạn: ${item.dueDate}\n`;
          });
          md += `\n`;
          break;
        case 'table':
          if (block.properties?.tableData) {
            const { headers, rows } = block.properties.tableData;
            md += `| ${headers.join(' | ')} |\n`;
            md += `| ${headers.map(() => '---').join(' | ')} |\n`;
            rows.forEach((row) => {
              md += `| ${row.join(' | ')} |\n`;
            });
            md += `\n`;
          }
          break;
        case 'image':
          md += `![${block.content || 'Hình ảnh'}](${block.properties?.url || ''})\n\n`;
          break;
        default:
          md += `${block.content}\n\n`;
      }
    });

    return md;
  };

  const markdownContent = generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard?.writeText(markdownContent);
    setCopied(true);
    onToast('Đã sao chép nội dung Markdown');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    onToast('Đã tải xuống tệp Markdown');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center">
              <FileText className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Xuất & In ấn tài liệu</h3>
              <p className="text-xs text-[#86868B] truncate max-w-[360px]">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Actions bar */}
        <div className="p-4 bg-[#F8F8FA] border-b border-[#E5E5EA] flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs font-semibold hover:bg-black transition-colors shadow-xs ios-interactive"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Tải tệp .md</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold hover:bg-[#F2F2F7] transition-colors shadow-2xs ios-interactive"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#1D1D1F] stroke-[2]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.75]" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép Markdown'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold hover:bg-[#F2F2F7] transition-colors shadow-2xs ml-auto ios-interactive"
          >
            <Printer className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>In ấn (Print PDF)</span>
          </button>
        </div>

        {/* Markdown preview */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#F5F5F7]">
          <pre className="text-xs font-mono text-[#1D1D1F] bg-white p-5 rounded-2xl border border-[#E5E5EA] whitespace-pre-wrap leading-relaxed ios-card-shadow">
            {markdownContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
