import React, { useState } from 'react';
import { X, Copy, Check, Lock, Globe, Users } from 'lucide-react';
import { Document, UserRole } from '../../types';
import { TEAM_MEMBERS } from '../../data/mockData';
import { documentUrl } from '../../app/router/routes';

interface ShareModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePermission: (role: UserRole, isPrivate: boolean) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  document,
  isOpen,
  onClose,
  onUpdatePermission,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>(document.permission);
  const [isPrivate, setIsPrivate] = useState<boolean>(document.isPrivate);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = documentUrl(window.location.origin, document.id);
    navigator.clipboard?.writeText(url);
    setCopied(true);
    onToast('Đã sao chép liên kết tài liệu vào bộ nhớ tạm');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdatePermission(currentRole, isPrivate);
    onToast('Đã cập nhật quyền truy cập tài liệu');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="bg-[var(--ui-surface)] rounded-[24px] ios-elevated-shadow border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--ui-hover)] border border-[var(--ui-border)] text-[var(--ui-text)] flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ui-text)]">Chia sẻ & Phân quyền</h3>
              <p className="text-xs text-[var(--ui-tertiary)] truncate max-w-[260px]">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-hover)] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* iOS Toggle Switch (Monochrome) */}
          <div className="bg-[var(--ui-subtle)] p-4 rounded-2xl border border-[var(--ui-border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] flex items-center justify-center">
                {isPrivate ? (
                  <Lock className="w-4 h-4 stroke-[1.75]" />
                ) : (
                  <Globe className="w-4 h-4 stroke-[1.75]" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--ui-text)]">
                  {isPrivate ? 'Ghi chú riêng tư' : 'Chia sẻ nội bộ công ty'}
                </div>
                <div className="text-[11px] text-[var(--ui-tertiary)]">
                  {isPrivate
                    ? 'Chỉ bạn và người được chỉ định xem được'
                    : 'Toàn bộ nhân sự công ty có thể xem'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                !isPrivate ? 'bg-[var(--ui-primary)]' : 'bg-[#D1D1D6]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--ui-surface)] shadow-xs ring-0 transition duration-200 ease-in-out ${
                  !isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--ui-text)] block">
              Quyền mặc định của người tham gia
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'viewer' as UserRole, label: 'Chỉ xem', desc: 'Đọc & in ấn' },
                { role: 'editor' as UserRole, label: 'Được sửa', desc: 'Thêm & xóa block' },
                { role: 'owner' as UserRole, label: 'Chủ sở hữu', desc: 'Toàn quyền' },
              ].map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setCurrentRole(item.role)}
                  className={`p-3 rounded-2xl border text-left transition-all ios-interactive ${
                    currentRole === item.role
                      ? 'border-[var(--ui-primary)] theme-primary bg-[var(--ui-primary)] text-white shadow-xs'
                      : 'border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] bg-[var(--ui-subtle)] text-[var(--ui-text)]'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      currentRole === item.role ? 'text-white/80' : 'text-[var(--ui-tertiary)]'
                    }`}
                  >
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Member permission list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--ui-tertiary)] font-semibold">
              <span>Thành viên có quyền truy cập</span>
              <span>{TEAM_MEMBERS.length} người</span>
            </div>
            <div className="divide-y divide-[var(--ui-border)] max-h-40 overflow-y-auto border border-[var(--ui-border)] rounded-2xl bg-[var(--ui-subtle)]">
              <div className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full theme-primary bg-[var(--ui-primary)] text-white flex items-center justify-center text-[10px] font-bold">
                    {document.author.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--ui-text)]">{document.author.name} (Bạn)</div>
                    <div className="text-[10px] text-[var(--ui-tertiary)]">{document.author.email}</div>
                  </div>
                </div>
                <span className="text-[11px] text-[var(--ui-text)] bg-[var(--ui-border)] px-2.5 py-0.5 rounded-full font-semibold">
                  Chủ sở hữu
                </span>
              </div>

              {TEAM_MEMBERS.slice(1, 4).map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[var(--ui-border)] text-[var(--ui-text)] flex items-center justify-center text-[10px] font-bold">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--ui-text)]">{member.name}</div>
                      <div className="text-[10px] text-[var(--ui-tertiary)]">{member.role}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--ui-tertiary)]">
                    {isPrivate ? 'Không có quyền' : currentRole === 'editor' ? 'Được sửa' : 'Chỉ xem'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--ui-subtle)] border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-border)] rounded-xl transition-colors ios-interactive"
          >
            {copied ? <Check className="w-3.5 h-3.5 stroke-[2]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.75]" />}
            <span>{copied ? 'Đã chép link' : 'Sao chép liên kết'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-[var(--ui-muted)] hover:text-[var(--ui-text)] rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white theme-primary bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-xl shadow-xs transition-colors ios-interactive"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
