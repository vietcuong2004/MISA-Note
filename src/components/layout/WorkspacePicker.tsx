import { SIDEBAR_HEADER_BUTTON_CLASS } from './sidebarStyles';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, LockKeyhole } from 'lucide-react';
import { SpaceType } from '../../types';

const spaces = [
  { value: 'personal', label: 'Ghi chép của tôi', description: 'Không gian ghi chú cá nhân', Icon: LockKeyhole },
  { value: 'company', label: 'Tài liệu công ty', description: 'Không gian tài liệu công ty', Icon: Building2 },
] as const;

export function WorkspacePicker({ space, iconOnly, onChange }: { space: SpaceType; iconOnly: boolean; onChange: (space: SpaceType) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = spaces.find(item => item.value === space)!;
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);
  useEffect(() => setOpen(false), [space]);
  const close = () => { setOpen(false); trigger.current?.focus(); };

  return <div ref={root} className={`relative mr-auto h-9 ${iconOnly ? 'w-9 shrink-0' : 'w-48 min-w-0 max-w-[calc(100%_-_40px)]'}`}>
    <button ref={trigger} type="button" role="combobox" aria-label="Không gian tài liệu" aria-haspopup="listbox"
      aria-expanded={open} aria-controls={id} aria-valuetext={current.label} data-space={space} title={current.label}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
        if (event.key === 'Escape') close();
      }}
      className={`${SIDEBAR_HEADER_BUTTON_CLASS} w-full ${iconOnly ? 'justify-center' : 'px-1.5'}`}>
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--ui-hover)]">
        <current.Icon className={`h-4 w-4 ${space === 'personal' ? 'text-amber-500' : 'text-slate-500'}`} />
      </span>
      {!iconOnly && <><span className="min-w-0 flex-1 truncate text-left">{current.label}</span><ChevronDown className="h-3 w-3 shrink-0 text-[var(--ui-muted)]" /></>}
    </button>
    {open && <div ref={menu} id={id} role="listbox" aria-label="Chọn không gian tài liệu"
      className="absolute left-0 top-full z-50 mt-1.5 w-64 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] py-1 shadow-xl"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const options = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('[role="option"]'));
          const index = options.indexOf(document.activeElement as HTMLButtonElement);
          options[event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
        }
      }}>
      {spaces.map(({ value, label, description, Icon }) => <button key={value} type="button" role="option" aria-selected={value === space} data-space={value}
        onClick={() => { close(); onChange(value); }}
        className={`flex w-full items-center gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ui-accent)] ${value === space ? 'bg-[var(--ui-hover)]' : 'hover:bg-[var(--ui-hover)]'}`}>
        <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${value === 'personal' ? 'text-amber-500' : 'text-slate-500'}`} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm text-[var(--ui-text)]">{label}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--ui-tertiary)]">{description}</span></span>
        {value === space && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-500" />}
      </button>)}
    </div>}
  </div>;
}
