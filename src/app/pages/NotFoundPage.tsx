import React from 'react';
import { pathForView } from '../router/routes';

export function NotFoundPage({ title = 'Không tìm thấy trang', onGoHome }: { title?: string; onGoHome?: () => void }) {
  return <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
    <h1 className="text-xl font-semibold">{title}</h1>
    <p className="text-sm text-[var(--ui-muted)]">Nội dung không tồn tại hoặc đã được xóa.</p>
    <a href={pathForView({ type: 'space_root', space: 'personal' })} onClick={event => { if (onGoHome) { event.preventDefault(); onGoHome(); } }}
      className="rounded-lg theme-primary bg-[var(--ui-primary)] text-white px-4 py-2 text-sm">Về Ghi chép của tôi</a>
  </div>;
}
