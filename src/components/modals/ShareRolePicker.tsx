import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type ShareRole = 'viewer' | 'commenter' | 'editor';
const options = [
  { value: 'viewer', label: 'Người xem' },
  { value: 'commenter', label: 'Người nhận xét' },
  { value: 'editor', label: 'Người chỉnh sửa' },
] as const;

export function ShareRolePicker({ value, onChange, disabled = false, label = 'Quyền qua liên kết', onRemove }: {
  value: ShareRole; onChange: (role: ShareRole) => void; disabled?: boolean; label?: string; onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => { setOpen(false); button.current?.focus(); };
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = button.current!.getBoundingClientRect();
      const height = menu.current?.getBoundingClientRect().height || 180;
      setPosition({ left: Math.max(8, Math.min(rect.right - 230, window.innerWidth - 238)), top: Math.max(8, rect.bottom + height + 6 > window.innerHeight ? rect.top - height - 6 : rect.bottom + 6) });
    };
    update();
    menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);
  return <div className={onRemove ? 'w-44 shrink-0' : 'col-start-2 w-full max-w-44 justify-self-end sm:col-start-auto'}>
    <button ref={button} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
      aria-valuetext={options.find(option => option.value === value)!.label} data-value={value} disabled={disabled}
      onClick={() => setOpen(previous => !previous)} onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--ui-text)] outline-none hover:bg-[var(--ui-hover-strong)] focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] disabled:opacity-40 ${onRemove ? 'bg-transparent' : 'bg-[var(--ui-hover)]'}`}>
      <span className="whitespace-nowrap">{options.find(option => option.value === value)!.label}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
    </button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label="Vai trò" style={position}
      className="fixed z-[120] w-[230px] max-w-[calc(100vw-16px)] rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] py-2 text-[var(--ui-text)] shadow-xl"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key === 'Tab') close();
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          const buttons = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('[role="option"]'));
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }
      }}>
      <p className="px-4 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-[var(--ui-muted)]">Vai trò</p>
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={value === option.value} data-value={option.value}
        onClick={() => { onChange(option.value); close(); }} className="flex w-full items-center gap-4 px-4 py-3 text-left text-sm outline-none hover:bg-[var(--ui-hover)] focus:bg-[var(--ui-hover)]">
        <span className="h-4 w-4 shrink-0">{value === option.value && <Check className="h-4 w-4 text-[#0866ff]" />}</span>{option.label}
      </button>)}
      {onRemove && <button type="button" role="option" aria-selected={false} data-value="remove" onClick={() => { close(); onRemove(); }}
        className="mt-1 w-full border-t border-[var(--ui-border)] px-4 py-3 text-left text-sm text-red-600 outline-none hover:bg-[var(--ui-hover)] focus:bg-[var(--ui-hover)]">Xóa quyền truy cập</button>}
    </div>, document.body)}
  </div>;
}
