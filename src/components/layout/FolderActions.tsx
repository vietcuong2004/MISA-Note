import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, FolderInput, MoreHorizontal, Trash2 } from 'lucide-react';
import { Folder, SpaceType } from '../../types';
import { SpaceCreateMenu } from './SpaceCreateMenu';

export function FolderActions({ folder, onCreateDocument, onCreateFolder, onRename, onMove, onDelete, alwaysVisible = false }: {
  folder: Folder;
  onCreateDocument?: (space: SpaceType, folderId?: string | null) => void;
  onCreateFolder?: (space: SpaceType, parentId?: string | null) => void;
  onRename?: (folder: Folder) => void;
  onMove?: (folder: Folder) => void;
  onDelete?: (id: string) => void;
  alwaysVisible?: boolean;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const outside = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPosition(null); trigger.current?.focus(); }
    };
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) setPosition(null); };
    document.addEventListener('mousedown', outside); window.addEventListener('keydown', escape);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('mousedown', outside); window.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [position]);

  const choose = (action: () => void) => { setPosition(null); action(); };
  return <div className={`flex shrink-0 items-center gap-0.5 transition-opacity ${position || alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100'}`}
    onClick={event => event.stopPropagation()}>
    {(onCreateDocument || onCreateFolder) && <SpaceCreateMenu title={`Tạo thư mục con trong ${folder.name}`}
      onCreateDocument={() => onCreateDocument?.(folder.space, folder.id)} onCreateFolder={() => onCreateFolder?.(folder.space, folder.id)} />}
    <button ref={trigger} type="button" aria-label={`Tùy chọn thư mục ${folder.name}`} title="Tùy chọn thư mục"
      aria-haspopup="menu" aria-expanded={!!position} onClick={() => {
        if (position) { setPosition(null); return; }
        const rect = trigger.current!.getBoundingClientRect();
        setPosition({ top: Math.max(8, Math.min(rect.top, window.innerHeight - 170)), left: Math.max(8, Math.min(rect.right + 4, window.innerWidth - 264)) });
      }} className={`rounded-lg p-1 text-[var(--ui-muted)] hover:bg-[var(--ui-hover-strong)] ${position ? 'bg-[var(--ui-hover-strong)]' : ''}`}>
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
    {position && createPortal(<div ref={menu} role="menu" aria-label={`Thao tác thư mục ${folder.name}`}
      style={position} onClick={event => event.stopPropagation()}
      className="fixed z-50 w-64 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] py-1 text-xs text-[var(--ui-text)] shadow-xl"
      onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        const options = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button'));
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
      }}>
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold text-[var(--ui-tertiary)]">Thư mục</p>
      {onRename && <button type="button" role="menuitem" aria-label={`Đổi tên thư mục ${folder.name}`} onClick={() => choose(() => onRename(folder))}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--ui-hover)]"><Edit2 className="h-3.5 w-3.5" />Đổi tên</button>}
      {onMove && <button type="button" role="menuitem" aria-label={`Di chuyển thư mục ${folder.name}`} onClick={() => choose(() => onMove(folder))}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--ui-hover)]"><FolderInput className="h-3.5 w-3.5" />Di chuyển đến</button>}
      {onDelete && <button type="button" role="menuitem" aria-label={`Xóa thư mục ${folder.name}`} onClick={() => choose(() => onDelete(folder.id))}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--ui-hover)]"><Trash2 className="h-3.5 w-3.5" />Xóa thư mục</button>}
    </div>, document.body)}
  </div>;
}
