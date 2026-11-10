import React, { useEffect, useRef, useState } from 'react';
import { FileText, FolderPlus, Plus } from 'lucide-react';

export function SpaceCreateMenu({ title, onCreateDocument, onCreateFolder }: {
  title: string;
  onCreateDocument: () => void;
  onCreateFolder: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    const outside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return <div ref={container} className="relative" onClick={event => event.stopPropagation()}>
    <button ref={trigger} type="button" title={title} aria-label={title} aria-expanded={open}
      aria-haspopup="menu" onClick={() => setOpen(previous => !previous)}
      className="p-1 rounded-md hover:bg-[var(--ui-border)] text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] cursor-pointer">
      <Plus className="w-3.5 h-3.5 stroke-[2]" />
    </button>
    {open && <div role="menu" aria-label={title}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        }
      }}
      className="absolute right-0 top-full mt-1 z-40 w-44 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1 shadow-lg normal-case tracking-normal text-xs font-medium text-[var(--ui-text)]">
      <button ref={firstItem} type="button" role="menuitem" onClick={() => choose(onCreateDocument)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--ui-hover)]">
        <FileText className="w-3.5 h-3.5" />Tạo tài liệu
      </button>
      <button type="button" role="menuitem" onClick={() => choose(onCreateFolder)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--ui-hover)]">
        <FolderPlus className="w-3.5 h-3.5" />Tạo thư mục
      </button>
    </div>}
  </div>;
}
