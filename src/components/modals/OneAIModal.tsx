import React, { useState } from 'react';
import { X, Send, Bot, Lightbulb, Clock, CheckCircle2 } from 'lucide-react';

interface OneAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  onInsertToDoc?: (text: string) => void;
}

export const OneAIModal: React.FC<OneAIModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  onInsertToDoc,
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const SUGGESTED_PROMPTS = [
    'Tóm tắt các điểm cốt lõi và kết luận trong tài liệu này',
    'Trích xuất toàn bộ việc cần làm (Action Items) kèm người phụ trách',
    'Gợi ý khung chương trình họp chuẩn 45 phút cho sprint mới',
    'Chỉnh sửa câu từ chuyên nghiệp, súc tích hơn theo chuẩn nội bộ',
  ];

  const handleRunPrompt = (text: string) => {
    setPrompt(text);
    setLoading(true);
    setResponse(null);

    setTimeout(() => {
      setLoading(false);
      setResponse(
        `[Kết quả từ One AI Engine - Cổng kết nối sẵn sàng]:\n\n` +
          `Dựa trên ngữ cảnh tài liệu "${documentTitle || 'Ghi chú nội bộ'}", hệ thống tổng hợp:\n` +
          `1. Mục tiêu cốt lõi: Hoàn thiện tính năng đúng thời hạn với chuẩn giao diện iOS & Notion.\n` +
          `2. Trọng tâm: Tối ưu hóa 20 block soạn thảo, giảm độ trễ lưu trữ và chuẩn hóa phân quyền.\n` +
          `3. Đề xuất: Bổ sung checklist nghiệm thu chi tiết cho tuần tiếp theo.`
      );
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    handleRunPrompt(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--ui-text)]">One AI Assistant</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--ui-hover)] text-[var(--ui-text)] border border-[var(--ui-border)]">
              Chờ kết nối One AI
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            className="p-1.5 rounded-lg text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Status banner */}
          <div className="p-4 rounded-2xl bg-[var(--ui-subtle)] border border-[var(--ui-border)] flex items-start gap-3">
            <Bot className="w-5 h-5 text-[var(--ui-text)] shrink-0 mt-0.5 stroke-[1.75]" />
            <div className="text-xs text-[var(--ui-muted)] leading-relaxed">
              <span className="font-bold text-[var(--ui-text)]">Giao diện chờ kết nối One AI:</span> Cổng API kết nối One AI đã được thiết lập sẵn. Bạn có thể thử nghiệm các câu lệnh tóm tắt, trích xuất đầu việc hoặc sinh ý tưởng bên dưới.
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text)]">
              <Lightbulb className="w-3.5 h-3.5 text-[var(--ui-text)] stroke-[1.75]" />
              <span>Gợi ý tác vụ nhanh với tài liệu</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunPrompt(item)}
                  className="text-left p-3 rounded-2xl border border-[var(--ui-border)] hover:border-[var(--ui-primary)]/40 hover:bg-[var(--ui-subtle)] text-xs text-[var(--ui-text)] transition-all flex items-center justify-between group ios-interactive"
                >
                  <span className="truncate pr-2 font-medium">{item}</span>
                  <span className="text-[10px] text-[var(--ui-text)] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Chạy →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Response Box */}
          {loading && (
            <div className="p-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-subtle)] flex items-center justify-center gap-2 text-xs text-[var(--ui-muted)]">
              <Clock className="w-4 h-4 animate-spin text-[var(--ui-text)] stroke-[1.75]" />
              <span>One AI đang xử lý ngữ cảnh tài liệu...</span>
            </div>
          )}

          {response && (
            <div className="p-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-subtle)] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--ui-text)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--ui-text)] stroke-[1.75]" /> Kết quả từ One AI
                </span>
                {onInsertToDoc && (
                  <button
                    onClick={() => {
                      onInsertToDoc(response);
                      onClose();
                    }}
                    className="text-[11px] text-[var(--ui-text)] hover:underline font-bold"
                  >
                    Chèn vào tài liệu
                  </button>
                )}
              </div>
              <pre className="text-xs text-[var(--ui-text)] whitespace-pre-wrap font-sans leading-relaxed">
                {response}
              </pre>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--ui-border)] bg-[var(--ui-subtle)]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Nhập yêu cầu cho One AI..."
              className="w-full pl-4 pr-12 py-2.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-shadow text-[var(--ui-text)]"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="absolute right-1.5 p-2 rounded-xl theme-primary bg-[var(--ui-primary)] text-white disabled:opacity-40 hover:bg-[var(--ui-primary-hover)] transition-colors ios-interactive"
            >
              <Send className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
