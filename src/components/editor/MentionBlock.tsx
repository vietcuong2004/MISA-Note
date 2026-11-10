import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { Block, BlockProperties } from '../../types';
import { EmployeePicker, employeeName } from './EmployeePicker';

const permissions = [
  { id: 'full', label: 'Truy cập đầy đủ' },
  { id: 'edit', label: 'Có thể chỉnh sửa' },
  { id: 'comment', label: 'Có thể bình luận' },
  { id: 'view', label: 'Có thể xem' },
] as const;
type Mention = NonNullable<BlockProperties['mention']>;

function MentionDialog({ kind, value, onSave, onClose }: {
  kind: Mention['kind']; value?: Mention; onSave: (value: Mention) => void; onClose: () => void;
}) {
  const [emails, setEmails] = useState<string[]>(value?.emails || []);
  const [pending, setPending] = useState<string[]>([]);
  const [groupName, setGroupName] = useState(value?.groupName || '');
  const [message, setMessage] = useState(value?.message || '');
  const [roles, setRoles] = useState<Record<string, Mention['permission']>>(() => Object.fromEntries(
    (value?.emails || []).map(email => [email, value?.permissions?.[email] || value?.permission || 'full'])
  ));
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const initial = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (kind === 'group') initial.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);

  return createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4"
    onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={kind === 'group' ? 'Mời và phân quyền nhóm' : 'Mời và phân quyền'}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const elements = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select'));
          const first = elements[0]; const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}
      className="flex w-full max-w-4xl max-h-[calc(100dvh-32px)] flex-col rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ui-border)] px-6 py-5">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold tracking-tight">Mời và phân quyền</h2>
          <span className="rounded-full bg-[var(--ui-hover)] px-2 py-0.5 text-[10px] text-[var(--ui-tertiary)]">Mô phỏng</span></div>
        <button type="button" aria-label="Đóng hộp thoại mời" onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--ui-hover)]"><X className="h-5 w-5" /></button>
      </header>
      <form className="flex min-h-0 flex-col" onSubmit={event => {
        event.preventDefault();
        if (kind === 'group' && !groupName.trim()) { setError('Nhập tên nhóm.'); return; }
        if (!emails.length) { setError('Thêm ít nhất một nhân viên vào danh sách được mời.'); return; }
        if (pending.length) { setError('Bấm Thêm để đưa những người vừa chọn vào danh sách trước khi gửi.'); return; }
        onSave({ kind, emails, groupName: kind === 'group' ? groupName.trim() : undefined,
          message: message.trim(), permission: roles[emails[0]] || 'full',
          permissions: Object.fromEntries(emails.map(email => [email, roles[email] || 'full'])), scope: 'page' });
        onClose();
      }}>
        <div className="min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {kind === 'group' && <label className="block text-sm font-semibold">Tên nhóm
            <input ref={initial} aria-label="Tên nhóm" placeholder="Tên nhóm..." value={groupName} onChange={event => setGroupName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--ui-border)] bg-transparent px-3 py-2.5 text-sm font-normal" /></label>}
          <section className="border-b border-[var(--ui-border)] pb-5 space-y-3">
            <h3 className="text-lg font-semibold">Thêm người</h3>
            <div className="flex flex-wrap items-end gap-3">
              <EmployeePicker value={pending} exclude={emails} invitationLayout autoFocus={kind === 'person'}
                onChange={next => { setPending(next); setError(''); }} />
              <button type="button" disabled={!pending.length} onClick={() => {
                setEmails(previous => [...new Set([...previous, ...pending])]);
                setRoles(previous => ({ ...previous, ...Object.fromEntries(pending.map(email => [email, 'full' as const])) }));
                setPending([]); setError('');
              }} className="rounded-lg bg-[#087cfa] px-7 py-3 text-sm font-semibold text-white hover:bg-[#066bda] disabled:opacity-40 disabled:cursor-not-allowed">Thêm</button>
            </div>
            <p className="text-xs text-[var(--ui-muted)]">Thêm người vào danh sách, sau đó chọn quyền cho từng người.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Danh sách người được mời ({emails.length})</h3>
            <div className="divide-y divide-[var(--ui-border)] rounded-lg border border-[var(--ui-border)]">
              {!emails.length && <p className="px-4 py-8 text-center text-sm text-[var(--ui-tertiary)]">Chưa có người được mời.</p>}
              {emails.map((email, index) => {
                const name = employeeName(email);
                const initials = name.split(' ').slice(-2).map(part => part[0]).join('').toUpperCase();
                return <div key={email} data-invite-email={email} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700'][index % 3]}`}>{initials}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{name}</p><p className="text-xs text-[var(--ui-muted)] break-all mt-0.5">{email}</p></div>
                  <select aria-label={`Quyền của ${name}`} value={roles[email] || 'full'}
                    onChange={event => setRoles(previous => ({ ...previous, [email]: event.target.value as Mention['permission'] }))}
                    className="w-44 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2.5 text-sm">
                    {permissions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                  <button type="button" aria-label={`Xóa ${name} khỏi danh sách mời`} onClick={() => setEmails(previous => previous.filter(item => item !== email))}
                    className="rounded-lg p-2 text-[var(--ui-muted)] hover:bg-[var(--ui-hover)] hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>;
              })}
            </div>
          </section>
          <label className="block text-sm font-semibold">Lời nhắn <span className="font-normal">(không bắt buộc)</span>
            <textarea aria-label="Lời nhắn" placeholder="Nhập lời nhắn gửi đến người được mời" value={message} onChange={event => setMessage(event.target.value)} rows={3}
              className="mt-2 w-full rounded-lg border border-[var(--ui-border)] bg-transparent px-3 py-2.5 text-sm font-normal resize-y" />
          </label>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-[var(--ui-border)] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--ui-border)] px-6 py-2.5 text-sm hover:bg-[var(--ui-hover)]">Hủy</button>
          <button type="submit" className="rounded-lg bg-[#087cfa] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#066bda]">{value ? 'Lưu thay đổi' : 'Gửi lời mời'} ({emails.length})</button>
        </footer>
      </form>
    </div>
  </div>, document.body);
}

export function MentionBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  const value = block.properties?.mention;
  const kind = value?.kind || (block.properties?.utilityKind === 'Nhắc đến một nhóm' ? 'group' : 'person');
  const [open, setOpen] = useState(!value && !readOnly);
  const labels = value ? (value.groupName ? [value.groupName] : value.emails.map(employeeName)) : [];
  return <div className="flex min-h-6 flex-wrap items-center gap-1">
    {labels.map(label => <button key={label} type="button" disabled={readOnly} onClick={() => setOpen(true)}
      className="inline-flex max-w-full items-center rounded bg-[var(--ui-hover)] px-1 text-sm leading-6 text-[var(--ui-text)] disabled:cursor-default">
      <span className="break-words min-w-0">@{label}</span>
    </button>)}
    {!value && !open && !readOnly && <button type="button" aria-label="Mời và đề cập" onClick={() => setOpen(true)}
      className="rounded bg-[var(--ui-hover)] px-1 text-sm leading-6">@</button>}
    {open && !readOnly && <MentionDialog kind={kind} value={value} onClose={() => setOpen(false)}
      onSave={mention => {
        onChange(`@${mention.groupName || mention.emails.map(employeeName).join(', ')}`, { ...block.properties, mention });
      }} />}
  </div>;
}
