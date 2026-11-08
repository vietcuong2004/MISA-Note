import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';
import { NotFoundPage } from './NotFoundPage';
import { Folder as FolderIcon, Plus } from 'lucide-react';
import { ViewState } from '../../types';
import { getFolderPath } from '../../utils/folders';

export function FolderPage({ folderId, documents, folders, actions, onNavigate }: DocumentPageProps & { folderId: string; onNavigate: (view: ViewState) => void }) {
  const folder = folders.find(folder => folder.id === folderId);
  if (!folder) return <NotFoundPage title="Không tìm thấy thư mục" />;
  const children = folders.filter(child => child.parentId === folderId && child.space === folder.space);
  return <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
    <section aria-label="Thư mục con" className="px-6 md:px-10 pt-5 flex flex-wrap items-center gap-2 max-w-6xl w-full mx-auto">
      {folder.parentId && <button type="button" onClick={() => onNavigate({ type: 'folder', folderId: folder.parentId! })} className="text-xs text-[var(--ui-muted)] px-2 py-2 hover:underline">← {getFolderPath(folder.parentId, folders)}</button>}
      {children.map(child => <button key={child.id} type="button" onClick={() => onNavigate({ type: 'folder', folderId: child.id })}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--ui-border)] hover:bg-[var(--ui-hover)]"><FolderIcon className="w-4 h-4" />{child.name}</button>)}
      <button type="button" onClick={() => actions.onCreateFolder?.(folder.space, folder.id)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs hover:bg-[var(--ui-hover)]"><Plus className="w-4 h-4" />Thư mục con</button>
    </section>
    <LibraryView {...actions} title={folder.name} description={`${folder.space === 'personal' ? 'Ghi chú của tôi' : 'Tài liệu công ty'} / ${getFolderPath(folder.id, folders)}`}
    documents={documents.filter(doc => doc.folderId === folderId)} folders={folders.filter(candidate => candidate.space === folder.space)}
    showTabs={false} defaultSpace={folder.space} defaultFolderId={folderId} />
  </div>;
}
