import { EmployeePicker } from '../editor/EmployeePicker';
import { ShareRolePicker } from './ShareRolePicker';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Globe, Link2, LockKeyhole, Users, X } from 'lucide-react';
import { Document } from '../../types';
import { CURRENT_USER, TEAM_MEMBERS } from '../../data/mockData';
import { memoryStorage } from '../../utils/memoryStorage';
import { documentUrl } from '../../app/router/routes';

type AccessRole = 'editor' | 'commenter' | 'viewer';
type Recipient = { id: string; name: string; email: string; group?: boolean };
export interface ShareSettings { members: (Recipient & { role: AccessRole })[]; general: 'restricted' | 'link'; linkRole: AccessRole }
export function ShareDialog({ document: doc, onClose, onSave }: { document: Document; onClose: () => void; onSave?: (settings: ShareSettings) => void }) {
  const key = `misa_share_${doc.id}`;
  const [settings, setSettings] = useState<ShareSettings>(() => {
    const stored = memoryStorage.getItem(key);
    if (stored) { try { return JSON.parse(stored); } catch { /* Use the document's defaults. */ } }
    return { members: TEAM_MEMBERS.filter(person => person.id !== doc.author.id).slice(0, 2).map(person => ({ id: person.id, name: person.name, email: person.email, role: 'editor' })), general: doc.isPrivate ? 'restricted' : 'link', linkRole: 'viewer' };
  });
  const [pending, setPending] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const url = documentUrl(window.location.origin, doc.id);
  useEffect(() => {
    const previous = window.document.activeElement as HTMLElement | null;
    dialog.current?.querySelector('input')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useLayoutEffect(() => { if (error) { urlInput.current?.focus(); urlInput.current?.select(); } }, [error]);
  const copy = async () => {
    setError(''); setCopied(false);
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError('Không thể sao chép tự động. Nhấn Ctrl+C để sao chép liên kết đã chọn.'); }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Chia sẻ tài liệu" className="flex max-h-[calc(100dvh-32px)] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-2xl"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const items = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([readonly]),select')).filter(item => item.tabIndex >= 0);
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header className="flex shrink-0 items-start justify-between gap-4 px-6 pb-3 pt-6">
        <h2 className="min-w-0 break-words text-2xl font-semibold leading-tight">Chia sẻ &quot;{doc.title || 'Không có tiêu đề'}&quot;</h2>
        <button type="button" aria-label="Đóng chia sẻ" onClick={onClose} className="shrink-0 rounded-lg p-1 hover:bg-[var(--ui-hover)]"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-4">
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Thêm người</h3>
          <div className="flex flex-wrap items-end gap-3">
            <EmployeePicker value={pending} onChange={setPending} invitationLayout autoFocus
              exclude={[doc.author.email, ...TEAM_MEMBERS.filter(person => person.id === doc.author.id).map(person => person.email), ...settings.members.map(person => person.email)]} />
            <button type="button" disabled={!pending.length} onClick={() => {
              const selected = TEAM_MEMBERS.filter(person => pending.includes(person.email));
              setSettings(previous => ({ ...previous, members: [...previous.members, ...selected.map(person => ({ id: person.id, name: person.name, email: person.email, role: 'editor' as const }))] }));
              setPending([]);
            }} className="shrink-0 rounded-lg bg-[#087bff] px-5 py-3 text-sm font-medium text-white disabled:opacity-45">Thêm</button>
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Những người có quyền truy cập</h3>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#252525] text-lg font-semibold text-white">{doc.author.name[0]}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{doc.author.name}{doc.author.id === CURRENT_USER.id ? ' (Bạn)' : ''}</p><p className="truncate text-sm text-[var(--ui-muted)]">{doc.author.email}</p></div>
            <span className="shrink-0 text-sm text-[var(--ui-tertiary)]">Chủ sở hữu</span>
          </div>
          {settings.members.map((person, index) => <div key={person.id} className="flex flex-wrap items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-medium ${index % 2 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{person.group ? <Users className="h-5 w-5" /> : person.name[0]}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.name}</p><p className="truncate text-sm text-[var(--ui-muted)]">{person.email}</p></div>
            <ShareRolePicker label={`Quyền của ${person.name}`} value={person.role}
              onChange={role => setSettings(previous => ({ ...previous, members: previous.members.map(member => member.id === person.id ? { ...member, role } : member) }))}
              onRemove={() => setSettings(previous => ({ ...previous, members: previous.members.filter(member => member.id !== person.id) }))} />
          </div>)}
        </section>
        <section className="space-y-3 border-t border-[var(--ui-border)] pt-5">
          <h3 className="text-base font-semibold">Quyền truy cập chung</h3>
          <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-lg bg-[var(--ui-subtle)] px-3 py-2.5 sm:grid-cols-[32px_minmax(0,1fr)_160px]">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${settings.general === 'link' ? 'bg-green-100 text-green-900' : 'bg-[var(--ui-hover)] text-[var(--ui-muted)]'}`}>{settings.general === 'link' ? <Globe className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}</span>
            <div className="min-w-0">
              <select aria-label="Quyền truy cập chung" value={settings.general} onChange={event => setSettings(previous => ({ ...previous, general: event.target.value as ShareSettings['general'] }))} className="-ml-1 max-w-full truncate rounded-md bg-transparent px-1 py-1 text-sm font-medium text-[var(--ui-text)] outline-none focus:ring-1 focus:ring-[var(--ui-accent)]"><option value="restricted">Bị hạn chế</option><option value="link">Bất kỳ ai có liên kết</option></select>
              <p className="text-xs leading-4 text-[var(--ui-muted)]">{settings.general === 'link' ? 'Dùng đường liên kết để mở tài liệu.' : 'Chỉ những người được thêm mới có quyền truy cập.'}</p>
            </div>
            <ShareRolePicker value={settings.linkRole} disabled={settings.general !== 'link'}
              onChange={linkRole => setSettings(previous => ({ ...previous, linkRole }))} />
          </div>
        </section>
        {error && <div><input ref={urlInput} aria-label="Liên kết tài liệu" readOnly value={url} className="w-full rounded-lg border border-[var(--ui-border)] px-3 py-2 text-sm" /><p role="status" className="mt-1 text-xs text-[var(--ui-muted)]">{error}</p></div>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pb-6 pt-4">
        <button type="button" onClick={copy} className="flex items-center gap-2 rounded-full border border-[var(--ui-border-strong)] px-4 py-2.5 text-sm font-semibold text-[#0866ff] hover:bg-blue-50">{copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{copied ? 'Đã sao chép' : 'Sao chép đường liên kết'}</button>
        <button type="button" onClick={() => { memoryStorage.setItem(key, JSON.stringify(settings)); onSave?.(settings); onClose(); }} className="rounded-full bg-[#0866ff] px-7 py-2.5 text-sm font-semibold text-white hover:bg-blue-600">Xong</button>
      </footer>
    </div>
  </div>;
}
