import React from 'react';
import { ChevronsRight } from 'lucide-react';

/** Minimal vertical strip shown when either sidebar variant is collapsed. */
export function CollapsedSidebar({ onExpand, version }: { onExpand: () => void; version?: '2' }) {
  return (
    <aside
      {...(version ? { 'data-sidebar-version': version } : {})}
      className="app-sidebar w-10 h-full bg-[var(--ui-sidebar)] border-r border-[var(--ui-border)] flex flex-col items-center py-2.5 transition-all shrink-0 select-none"
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label="Mở rộng thanh bên"
        title="Mở rộng thanh bên"
        className="w-8 h-8 rounded-lg hover:bg-[var(--ui-hover)] flex items-center justify-center text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
      >
        <ChevronsRight className="w-4 h-4 stroke-[1.75]" />
      </button>
    </aside>
  );
}
