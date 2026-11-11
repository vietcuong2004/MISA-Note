import { formatDateTime } from '../../utils/dateTime';
import { SpaceCreateMenu } from '../../components/layout/SpaceCreateMenu';
import { FolderActions } from '../../components/layout/FolderActions';
import React, { useState } from 'react';
import { Folder as FolderIcon, FolderOpen, Plus, Home, Star, ChevronRight, ChevronDown, LayoutGrid, List, FolderTree, MoreHorizontal, FileText } from 'lucide-react';
import { DocumentPageProps } from './pageTypes';
import { NotFoundPage } from './NotFoundPage';
import { Folder, Document, ViewState, SpaceType } from '../../types';
import { getFolderAncestors } from '../../utils/folders';
import { canDropFolderInto, clearActiveDrag, getDragPayload, setDragFolder, setDragDocument } from '../../utils/dnd';
import { DocumentActionMenu } from '../../components/modals/DocumentActionMenu';
import { DocumentLinkShare } from '../../components/modals/DocumentLinkShare';
import { RenameDialog } from '../../components/modals/RenameDialog';

type Mode = 'structure' | 'grid' | 'list';
type Sort = 'sidebar' | 'name-asc' | 'name-desc' | 'updated';

export function FolderPage({ folderId, rootSpace, favoritesOnly = false, documents, folders, actions, onNavigate }:
  DocumentPageProps & { folderId: string; rootSpace?: SpaceType; favoritesOnly?: boolean; onNavigate: (view: ViewState) => void }) {
  const [mode, setMode] = useState<Mode>('structure');
  const [sort, setSort] = useState<Sort>('sidebar');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [documentMenu, setDocumentMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const folder: Folder | undefined = rootSpace ? { id: '__space_root', name: favoritesOnly ? 'Yêu thích' : rootSpace === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty', space: rootSpace, parentId: null, createdAt: '', updatedAt: '' } : folders.find(item => item.id === folderId);
  if (!folder) return <NotFoundPage title="Không tìm thấy thư mục" />;
  const activeDocs = documents.filter(doc => !doc.isTrash && (favoritesOnly ? doc.isFavorite && doc.space === 'personal' : doc.space === folder.space));
  const favoriteFolderIds = new Set(activeDocs.flatMap(doc => doc.folderId ? getFolderAncestors(doc.folderId, folders).map(item => item.id) : []));
  const HeaderIcon = favoritesOnly ? Star : FolderIcon;
  const ancestors = rootSpace ? [] : getFolderAncestors(folder.id, folders);
  const sortItems = <T extends { updatedAt: string }>(items: T[], name: (item: T) => string): T[] => [...items].sort((a, b) =>
    sort === 'sidebar' ? 0 : sort === 'updated' ? Date.parse(b.updatedAt) - Date.parse(a.updatedAt) : name(a).localeCompare(name(b), 'vi', { numeric: true }) * (sort === 'name-desc' ? -1 : 1));
  const childFolders = (parentId: string) => sortItems(folders.filter(item => (rootSpace && parentId === folder.id ? !item.parentId : item.parentId === parentId) && (favoritesOnly ? favoriteFolderIds.has(item.id) : item.space === folder.space)), item => item.name);
  const folderDocs = (parentId: string) => {
    const notes = activeDocs.filter(doc => (rootSpace && parentId === folder.id ? !doc.folderId : doc.folderId === parentId));
    return sort === 'sidebar' ? notes.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)) : sortItems(notes, doc => doc.title);
  };
  const children = childFolders(folder.id);
  const notes = folderDocs(folder.id);
  const menuDocument = documents.find(doc => doc.id === documentMenu?.id && !doc.isTrash);
  const shareDocument = documents.find(doc => doc.id === shareId && !doc.isTrash);
  const date = formatDateTime;
  const count = (item: Folder) => childFolders(item.id).length + folderDocs(item.id).length;

  const drop = (event: React.DragEvent, parentId: string | null) => {
    event.preventDefault(); event.stopPropagation(); setDragOver(null);
    if (rootSpace && parentId === folder.id) parentId = null;
    const payload = getDragPayload(event, folders, documents);
    clearActiveDrag();
    if (!payload) return;
    if (payload.type === 'folder') {
      if (!canDropFolderInto(payload.id, parentId, folders)) {
        actions.onToast?.('Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó', 'error'); return;
      }
      actions.onMoveFolder?.(payload.id, parentId, folder.space);
    } else actions.onMoveDocument?.(payload.id, parentId, folder.space);
  };
  const dropProps = (id: string | null) => favoritesOnly ? {} : ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault(); event.stopPropagation();
      const payload = getDragPayload(event, folders, documents);
      const blocked = payload?.type === 'folder' && !canDropFolderInto(payload.id, id, folders);
      event.dataTransfer.dropEffect = blocked ? 'none' : 'move';
      setDragOver(blocked ? null : id || 'root');
    },
    onDragLeave: (event: React.DragEvent) => {
      event.stopPropagation();
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(null);
    },
    onDrop: (event: React.DragEvent) => drop(event, id),
  });
  const folderMenu = (item: Folder) => favoritesOnly ? null : <FolderActions folder={item} onCreateDocument={actions.onCreateDocument}
    onCreateFolder={actions.onCreateFolder} onRename={actions.onEditFolder} onMove={actions.onMoveFolderRequest} onDelete={actions.onDeleteFolder} onDuplicate={actions.onDuplicateFolder} />;
  const dragFolder = (item: Folder) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => { event.stopPropagation(); setDragFolder(event, item.id); },
    onDragEnd: () => { clearActiveDrag(); setDragOver(null); },
  });
  const documentRow = (doc: Document, depth = 0) => <div key={doc.id} data-folder-document={doc.id}
    draggable onDragStart={event => { event.stopPropagation(); setDragDocument(event, doc.id); }} onDragEnd={clearActiveDrag}
    className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/50 px-4 py-2 hover:bg-[var(--ui-selected)]" style={{ paddingLeft: `${16 + depth * 26}px` }}>
    <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
    <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--ui-text)]" strokeWidth={1.75} />
    <button type="button" onClick={() => actions.onOpenDocument(doc.id)} className="min-w-0 flex-1 truncate text-left text-xs">{doc.title || 'Không có tiêu đề'}</button>
    <span className="hidden w-52 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-[var(--ui-tertiary)] sm:block">Cập nhật {date(doc.updatedAt)}</span>
    <div className="flex w-14 shrink-0 justify-end">
    <button type="button" aria-label={`Tùy chọn tài liệu ${doc.title}`} onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      setDocumentMenu({ id: doc.id, top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 260)), left: Math.max(8, Math.min(rect.right - 256, window.innerWidth - 264)) });
    }} className="rounded-lg p-1.5 text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]"><MoreHorizontal className="h-4 w-4" /></button>
    </div>
  </div>;
  const tree = (parentId: string, depth = 0, seen = new Set<string>()): React.ReactNode => <>
    {childFolders(parentId).filter(item => !seen.has(item.id)).map(item => <React.Fragment key={item.id}>
      <div data-folder-entry={item.id} {...dragFolder(item)} {...dropProps(item.id)}
        className={`group flex items-center gap-1.5 border-b border-[var(--ui-border)]/50 px-4 py-2 ${dragOver === item.id ? 'bg-[var(--ui-selected)] ring-2 ring-inset ring-[var(--ui-primary)]' : 'hover:bg-[var(--ui-selected)]'}`}
        style={{ paddingLeft: `${16 + depth * 26}px` }}>
        <button type="button" aria-label={`${collapsed.has(item.id) ? 'Mở rộng' : 'Thu gọn'} ${item.name}`} aria-expanded={!collapsed.has(item.id)}
          onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}
          className="rounded p-0.5 text-[var(--ui-tertiary)] hover:bg-[var(--ui-border)]">{collapsed.has(item.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
        {collapsed.has(item.id)
          ? <FolderIcon className="h-3.5 w-3.5 shrink-0 text-[var(--ui-text)]" strokeWidth={1.75} />
          : <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--ui-text)]" strokeWidth={1.75} />}
        <button type="button" onClick={() => onNavigate({ type: 'folder', folderId: item.id })} className="min-w-0 flex-1 truncate text-left text-xs font-medium">{item.name}</button>
        <span className="shrink-0 whitespace-nowrap text-xs text-[var(--ui-muted)]">{count(item)} mục</span>
        <span className="hidden w-52 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-[var(--ui-tertiary)] sm:block">Cập nhật {date(item.updatedAt)}</span>
        <div className="flex w-14 shrink-0 justify-end">{folderMenu(item)}</div>
      </div>
      {!collapsed.has(item.id) && tree(item.id, depth + 1, new Set([...seen, parentId, item.id]))}
    </React.Fragment>)}
    {folderDocs(parentId).map(doc => documentRow(doc, depth))}
  </>;

  return <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--ui-surface)] text-[var(--ui-text)]">
    <section aria-label="Thao tác thư mục và thư mục con" className="border-b border-[var(--ui-border)]">
      <nav aria-label="Đường dẫn thư mục" className="flex w-full flex-wrap items-center gap-2 px-[5%] py-4 text-sm">
        <button type="button" {...dropProps(null)} onClick={() => onNavigate(favoritesOnly ? { type: 'favorite' } : { type: 'space_root', space: folder.space })}
          className={`flex items-center gap-2 rounded-lg p-1 text-[var(--ui-accent)] ${dragOver === 'root' ? 'ring-2 ring-[var(--ui-primary)]' : ''}`}>
          <Home className="h-4 w-4" />{favoritesOnly ? 'Yêu thích' : folder.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'}
        </button>
        {ancestors.map(item => <React.Fragment key={item.id}><ChevronRight className="h-3.5 w-3.5 text-[var(--ui-tertiary)]" />
          <button type="button" {...dropProps(item.id)} onClick={() => onNavigate({ type: 'folder', folderId: item.id })}
            aria-current={item.id === folder.id ? 'page' : undefined}
            className={`rounded-lg p-1 ${item.id === folder.id ? 'font-semibold' : 'text-[var(--ui-accent)]'} ${dragOver === item.id ? 'ring-2 ring-[var(--ui-primary)]' : ''}`}>{item.name}</button>
        </React.Fragment>)}
      </nav>
    </section>
    <div className="w-full space-y-6 px-[5%] py-6">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4"><HeaderIcon className="h-14 w-14 shrink-0 text-[var(--ui-text)]" strokeWidth={1.2} />
          <div className="min-w-0"><h1 className="break-words text-3xl font-bold tracking-tight">{folder.name}</h1>
            <p className="mt-1 text-sm text-[var(--ui-muted)]">{favoritesOnly ? 'Các tài liệu quan trọng đã được gắn dấu sao' : 'Các thư mục và tài liệu bên trong'}</p></div></div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Cách hiển thị thư mục" className="inline-flex rounded-lg border border-[var(--ui-border)] p-0.5">
            {([{ id: 'structure', label: 'Structure', Icon: FolderTree }, { id: 'grid', label: 'Lưới', Icon: LayoutGrid }, { id: 'list', label: 'Danh sách', Icon: List }] as const).map(({ id, label, Icon }) =>
              <button key={id} type="button" aria-label={`Dạng ${label}`} title={label} aria-pressed={mode === id} onClick={() => { setMode(id); }}
                className={`rounded-md p-2 ${mode === id ? 'bg-[var(--ui-selected)] text-[var(--ui-accent)]' : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'}`}><Icon className="h-4 w-4" /></button>)}
          </div>
          <select aria-label="Sắp xếp thư mục" value={sort} onChange={event => setSort(event.target.value as Sort)} className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-xs">
            <option value="sidebar">Mặc định</option><option value="name-asc">Tên (A → Z)</option><option value="name-desc">Tên (Z → A)</option><option value="updated">Mới cập nhật</option>
          </select>
          {!favoritesOnly && (rootSpace ? <SpaceCreateMenu title="Tạo mới" onCreateDocument={() => actions.onCreateDocument?.(rootSpace, null)} onCreateFolder={() => actions.onCreateFolder?.(rootSpace, null)} /> : <FolderActions folder={folder} alwaysVisible onCreateDocument={actions.onCreateDocument}
            onCreateFolder={actions.onCreateFolder} onRename={actions.onEditFolder}
            onMove={actions.onMoveFolderRequest} onDelete={actions.onDeleteFolder} onDuplicate={actions.onDuplicateFolder} />)}
        </div>
      </header>
      <section aria-label="Nội dung thư mục" data-folder-mode={mode} {...dropProps(folder.id)} className="min-h-36">
        {mode === 'structure' ? <div className="rounded-xl border border-[var(--ui-border)]">{tree(folder.id)}</div> : <>
          <div className={mode === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-2'}>
            {children.map(item => <article key={item.id} data-folder-entry={item.id} {...dragFolder(item)} {...dropProps(item.id)}
              className={`group relative rounded-xl border border-[var(--ui-border)] ${dragOver === item.id ? 'bg-[var(--ui-selected)] ring-2 ring-[var(--ui-primary)]' : 'hover:bg-[var(--ui-hover)]'} ${mode === 'grid' ? 'p-5' : 'flex items-center gap-3 p-3'}`}>
              <button type="button" onClick={() => onNavigate({ type: 'folder', folderId: item.id })} className={`flex min-w-0 flex-1 text-left ${mode === 'grid' ? 'w-full flex-col items-start gap-3' : 'items-center gap-3'}`}>
                <FolderIcon className={`${mode === 'grid' ? 'h-14 w-14' : 'h-8 w-8'} shrink-0 text-[var(--ui-text)]`} strokeWidth={1.2} />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="mt-1 block text-xs text-[var(--ui-muted)]">{count(item)} mục · Cập nhật {date(item.updatedAt)}</span></span>
              </button>
              <div className={mode === 'grid' ? 'absolute right-2 top-2' : ''}>{folderMenu(item)}</div>
            </article>)}
          </div>
          {notes.length > 0 && <div className="mt-5 rounded-xl border border-[var(--ui-border)]">{notes.map(doc => documentRow(doc))}</div>}
        </>}
        {!children.length && !notes.length && <p className="py-12 text-center text-sm text-[var(--ui-tertiary)]">{favoritesOnly ? 'Chưa có tài liệu nào được gắn sao yêu thích.' : 'Thư mục trống. Tạo tài liệu hoặc thư mục con để bắt đầu.'}</p>}
      </section>
    </div>
    <DocumentActionMenu isOpen={!!menuDocument} isFavorite={menuDocument?.isFavorite}
      position={documentMenu || undefined} onClose={() => setDocumentMenu(null)}
      onToggleFavorite={menuDocument?.space === 'personal' ? () => actions.onToggleFavorite(menuDocument.id) : undefined}
      onDuplicate={actions.onDuplicateDocument ? () => { if (menuDocument) actions.onDuplicateDocument?.(menuDocument.id); } : undefined}
      onRename={() => { if (menuDocument) setRenameId(menuDocument.id); }}
      onShare={() => { if (menuDocument) setShareId(menuDocument.id); }}
      onMove={() => { if (menuDocument) actions.onMoveDocumentRequest?.(menuDocument); }}
      onDelete={() => { if (menuDocument) actions.onSoftDeleteDocument(menuDocument.id); }} />
    {renameId && <RenameDialog kind="document" initialName={documents.find(doc => doc.id === renameId)?.title || ''}
      onClose={() => setRenameId(null)} onSave={name => actions.onRenameDocument?.(renameId, name)} />}
    {shareDocument && <DocumentLinkShare document={shareDocument} onClose={() => setShareId(null)} />}
  </div>;
}
