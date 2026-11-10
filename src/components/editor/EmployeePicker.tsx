import React, { useEffect, useId, useRef, useState } from 'react';
import { ContactRound, Search, X } from 'lucide-react';
import { TEAM_MEMBERS } from '../../data/mockData';

const normalize = (text: string) => text.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

export const employeeName = (email: string) => TEAM_MEMBERS.find(person => person.email === email)?.name || email;

export function EmployeePicker({ value, onChange, autoFocus = false, exclude = [], invitationLayout = false }: {
  value: string[]; onChange: (emails: string[]) => void; autoFocus?: boolean; exclude?: string[]; invitationLayout?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const matches = TEAM_MEMBERS.filter(person => !value.includes(person.email) && !exclude.includes(person.email) &&
    (browse || normalize(`${person.name} ${person.email} ${person.role}`).includes(normalize(query))));
  const index = Math.min(active, Math.max(0, matches.length - 1));
  const closeList = () => { setOpen(false); setBrowse(false); };

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) { setOpen(false); setBrowse(false); }
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  useEffect(() => {
    if (open) container.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open, query]);

  const choose = (email: string) => {
    if (!value.includes(email)) onChange([...value, email]);
    setQuery(''); setActive(0); setOpen(browse);
    input.current?.focus();
  };

  return <div ref={container} className="relative min-w-0 flex-1 basis-48"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) closeList(); }}>
    {value.length > 0 && <div className="flex flex-wrap gap-1 px-1 pb-1" aria-label="Nhân viên đã chọn">
      {value.map(email => <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#2383e2]/10 px-2 py-1 text-xs text-[var(--ui-text)]">
        <span className="truncate" title={email}>{employeeName(email)}</span>
        <button type="button" aria-label={`Bỏ chọn ${employeeName(email)}`} onClick={() => onChange(value.filter(item => item !== email))}
          className="rounded hover:bg-[var(--ui-border)]"><X className="w-3 h-3" /></button>
      </span>)}
    </div>}
    <div className={`flex items-center ${invitationLayout ? 'gap-3' : 'gap-1 px-2'}`}>
      <div className={`flex flex-1 min-w-0 items-center gap-2 ${invitationLayout ? 'rounded-lg border border-[var(--ui-border)] px-3 py-2.5' : ''}`}>
      <Search className="w-3.5 h-3.5 shrink-0 text-[var(--ui-tertiary)]" />
      <input ref={input} role="combobox" aria-label="Tìm nhân viên" aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? listId : undefined} aria-activedescendant={open && matches[index] ? `${listId}-${matches[index].id}` : undefined}
        placeholder="Tìm tên hoặc email nhân viên..." value={query}
        onChange={event => { setQuery(event.target.value); setOpen(!!event.target.value.trim()); setBrowse(false); setActive(0); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); closeList(); return; }
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            if (!open && !query.trim()) return;
            event.preventDefault(); setOpen(true);
            setActive(previous => matches.length ? (previous + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length : 0);
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault(); event.stopPropagation();
            if (matches[index]) choose(matches[index].email);
          }
        }} className="w-full min-w-0 bg-transparent py-1 text-sm outline-none" />
      </div>
      <button type="button" aria-label="Danh bạ" aria-haspopup="listbox" aria-expanded={open && browse}
        onClick={() => {
          if (open && browse) closeList();
          else { setQuery(''); setBrowse(true); setOpen(true); setActive(0); }
          input.current?.focus();
        }} className={`inline-flex shrink-0 items-center gap-2 rounded-lg text-[var(--ui-text)] hover:bg-[var(--ui-hover)] ${invitationLayout ? 'border border-[var(--ui-border)] px-3 py-3 text-sm font-medium' : 'px-2 py-1 text-xs'}`}>
        <ContactRound className="w-3.5 h-3.5" />Danh bạ
      </button>
    </div>
    {open && <div className="absolute top-full left-0 z-20 mt-2 w-80 max-w-[calc(100vw-72px)] rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1 shadow-xl">
      <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-2 py-1 text-xs text-[var(--ui-muted)]">
        <span>{browse ? 'Danh bạ nhân viên' : 'Kết quả tìm kiếm'}</span>
        <button type="button" aria-label="Đóng danh sách nhân viên" onClick={() => { closeList(); input.current?.focus(); }}
          className="rounded p-1 hover:bg-[var(--ui-hover)]"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div id={listId} role="listbox" aria-label="Danh sách nhân viên" className="max-h-56 overflow-y-auto">
      {matches.length ? matches.map((person, optionIndex) => <button key={person.id} id={`${listId}-${person.id}`} type="button" role="option"
        aria-selected={optionIndex === index} data-active={optionIndex === index}
        onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(optionIndex)} onClick={() => choose(person.email)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left ${optionIndex === index ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2383e2]/10 text-xs text-[#2383e2]">{person.name.split(' ').slice(-1)[0].charAt(0)}</span>
        <span className="min-w-0"><span className="block text-sm font-medium">{person.name}</span>
          <span className="block truncate text-[11px] text-[var(--ui-tertiary)]">{person.email}</span>
          <span className="block text-[11px] text-[var(--ui-muted)]">{person.role}</span></span>
      </button>) : <p role="status" className="p-3 text-xs text-[var(--ui-tertiary)]">{query.trim() ? 'Không tìm thấy nhân viên phù hợp.' : 'Đã chọn tất cả nhân viên.'}</p>}
      </div>
    </div>}
  </div>;
}
