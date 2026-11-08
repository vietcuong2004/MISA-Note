import React, { useState } from 'react';
import { X, Send, MessageSquare, Folder, Check, Star } from 'lucide-react';
import { TEAM_MEMBERS } from '../../data/mockData';
import { Folder as FolderType, SpaceType } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  onToast: (msg: string) => void;
  folders?: FolderType[];
  onSaveAsDocument?: (
    title: string,
    folderId: string | null,
    space: SpaceType,
    messages: string[],
    isFavorite?: boolean
  ) => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isMe: boolean;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  onToast,
  folders = [],
  onSaveAsDocument,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'Hà Trần (Lead Dev)',
      avatar: 'H',
      text: 'Chào cả nhóm, mình vừa cập nhật phần kiến trúc block editor theo chuẩn iOS rồi nhé!',
      time: '10:14',
      isMe: false,
    },
    {
      id: 'm2',
      sender: 'Quỳnh Anh (PM)',
      avatar: 'Q',
      text: 'Tuyệt vời Hà ơi, biên bản họp vừa rồi đã phân công xong, mọi người kiểm tra lại action items trong tài liệu nhé.',
      time: '10:18',
      isMe: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [confirmSaveToFolder, setConfirmSaveToFolder] = useState<{
    folder: FolderType | null;
    space: SpaceType;
  } | null>(null);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'Nguyễn Văn Minh (Bạn)',
      avatar: 'M',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    onToast('Đã gửi tin nhắn nội bộ');
  };

  const handleSaveToFavorites = () => {
    const chatTitle = documentTitle ? `Thảo luận: ${documentTitle}` : 'Đoạn chat thảo luận nhóm';
    const textLines = messages.map((m) => `${m.sender} (${m.time}): ${m.text}`);
    onSaveAsDocument?.(chatTitle, null, 'personal', textLines, true);
    onToast('Đã lưu đoạn chat vào mục Yêu thích');
    onClose();
  };

  const handleExecuteSave = (folder: FolderType | null, space: SpaceType) => {
    const chatTitle = documentTitle ? `Thảo luận: ${documentTitle}` : 'Đoạn chat thảo luận nhóm';
    const textLines = messages.map((m) => `${m.sender} (${m.time}): ${m.text}`);
    onSaveAsDocument?.(chatTitle, folder?.id || null, space, textLines);
    const locName = folder ? `thư mục "${folder.name}"` : 'thư mục gốc';
    onToast(`Đã lưu đoạn chat vào ${locName}`);
    setShowFolderPicker(false);
    setConfirmSaveToFolder(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col h-[530px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ui-text)]">Thảo luận nội bộ nhanh</h3>
              <p className="text-xs text-[var(--ui-tertiary)]">
                {documentTitle ? `Ngữ cảnh: ${documentTitle}` : 'Trao đổi nhóm dự án'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Button Thêm vào yêu thích */}
            <button
              type="button"
              onClick={handleSaveToFavorites}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] text-xs font-semibold text-[var(--ui-text)] transition-colors cursor-pointer"
              title="Lưu đoạn chat và thêm vào mục Yêu thích"
            >
              <Star className="w-3.5 h-3.5 stroke-[1.75] text-[var(--ui-text)] fill-[#1D1D1F]" />
              <span>Thêm vào yêu thích</span>
            </button>

            {/* Button Lưu vào thư mục */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFolderPicker(!showFolderPicker)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-hover)] text-xs font-semibold text-[var(--ui-text)] transition-colors cursor-pointer"
                title="Lưu đoạn chat vào thư mục"
              >
                <Folder className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Lưu vào thư mục</span>
              </button>

              {showFolderPicker && (
                <div className="absolute right-0 top-9 z-50 w-56 bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-border)] shadow-xl py-1 text-xs text-[var(--ui-text)] animate-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-bold text-[var(--ui-tertiary)] uppercase">
                    Chọn thư mục lưu
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmSaveToFolder({ folder: null, space: 'personal' })}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
                  >
                    <span>📂</span>
                    <span>Ghi chép của tôi (Gốc)</span>
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setConfirmSaveToFolder({ folder: f, space: f.space })}
                      className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--ui-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{f.icon || '📁'}</span>
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span className="text-[10px] text-[var(--ui-tertiary)]">
                        {f.space === 'personal' ? 'Của tôi' : 'Công ty'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
        </div>

        {/* Participant list preview */}
        <div className="px-6 py-2.5 bg-[var(--ui-subtle)] border-b border-[var(--ui-border)] flex items-center gap-2 overflow-x-auto text-xs text-[var(--ui-muted)]">
          <span className="text-[11px] font-semibold text-[var(--ui-tertiary)] shrink-0">Tham gia:</span>
          {TEAM_MEMBERS.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[11px] font-medium text-[var(--ui-text)] shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-primary)]"></span>
              {m.name.split(' ').slice(-1)[0]}
            </span>
          ))}
        </div>

        {/* Message feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3.5 bg-[var(--ui-surface)]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-2 text-[10px] text-[var(--ui-tertiary)] px-1 font-mono">
                <span>{msg.sender}</span>
                <span>·</span>
                <span>{msg.time}</span>
              </div>
              <div
                className={`max-w-[80%] rounded-[18px] px-4 py-2.5 text-xs leading-relaxed ${
                  msg.isMe
                    ? 'theme-primary bg-[var(--ui-primary)] text-white rounded-br-xs'
                    : 'bg-[var(--ui-hover)] text-[var(--ui-text)] rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-[var(--ui-border)] bg-[var(--ui-subtle)]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="w-full pl-4 pr-12 py-2.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] text-[var(--ui-text)]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 p-2 rounded-xl theme-primary bg-[var(--ui-primary)] text-white disabled:opacity-40 hover:bg-[var(--ui-primary-hover)] transition-colors ios-interactive"
            >
              <Send className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </form>

        {/* Confirmation Modal to Save Chat into Folder */}
        {confirmSaveToFolder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-100">
            <div className="bg-[var(--ui-surface)] rounded-[24px] border border-[var(--ui-border)] shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center">
                  <Folder className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--ui-text)]">Xác nhận lưu vào thư mục</h4>
                  <p className="text-[11px] text-[var(--ui-tertiary)]">Chuyển cuộc trò chuyện thành ghi chú</p>
                </div>
              </div>

              <div className="p-3 bg-[var(--ui-subtle)] rounded-xl border border-[var(--ui-border)] text-xs space-y-1">
                <div className="font-semibold text-[var(--ui-text)]">
                  {documentTitle ? `Thảo luận: ${documentTitle}` : 'Đoạn chat thảo luận nhóm'}
                </div>
                <div className="text-[11px] text-[var(--ui-tertiary)]">
                  Đích đến:{' '}
                  <strong className="text-[var(--ui-text)]">
                    {confirmSaveToFolder.folder
                      ? confirmSaveToFolder.folder.name
                      : 'Thư mục gốc'}
                  </strong>{' '}
                  ({confirmSaveToFolder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'})
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmSaveToFolder(null)}
                  className="px-3.5 py-1.5 text-xs text-[var(--ui-muted)] hover:text-[var(--ui-text)] rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleExecuteSave(confirmSaveToFolder.folder, confirmSaveToFolder.space)
                  }
                  className="px-3.5 py-1.5 text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-xl shadow-xs"
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
