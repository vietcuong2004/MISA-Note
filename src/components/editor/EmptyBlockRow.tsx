import React from 'react';
import { GripVertical, Plus } from 'lucide-react';

export function EmptyBlockRow({ listId, compact = false, onCreate }: { listId: string; compact?: boolean; onCreate: (openMenu: boolean) => void }) {
  return <div data-list-exit-for={listId}
    className={`no-print group/empty relative -ml-14 rounded-xl ${compact ? '!my-0 h-0' : 'py-1.5'}`}>
    <div className={`flex items-center gap-0.5 pl-1 pr-2 ${compact ? 'absolute inset-x-0 top-0 z-10 h-2 hover:h-6 focus-within:h-6' : ''}`}>
    <div className="flex h-6 w-[50px] shrink-0 items-center gap-0.5 opacity-0 group-hover/empty:opacity-100 focus-within:opacity-100 transition-opacity">
      <button type="button" aria-label="Thêm khối sau danh sách" onClick={() => onCreate(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Tùy chọn khối sau danh sách" onClick={() => onCreate(true)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
    <button type="button" aria-label="Gõ văn bản bên dưới danh sách" onClick={() => onCreate(false)}
      className={`${compact ? 'h-full' : 'h-6'} flex-1 cursor-text bg-transparent text-left outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]`} />
    </div>
  </div>;
}
