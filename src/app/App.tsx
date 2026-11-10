import { memoryStorage } from '../utils/memoryStorage';
import React, { useState, useEffect } from 'react';
import {
  Document,
  Block,
  Folder,
  SpaceType,
  UserRole,
} from '../types';
import {
  getStoredDocuments,
  getStoredFolders,
  upsertDocument,
  softDeleteDocument,
  restoreDocumentFromTrash,
  permanentDeleteDocument,
  emptyTrashPermanently,
  moveDocumentToFolderOrSpace,
  moveFolderToParentOrSpace,
  toggleDocumentFavorite,
  upsertFolder,
  deleteFolderAndReassign,
} from '../utils/storage';
import { TEMPLATES, CURRENT_USER } from '../data/mockData';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { FolderModal } from '../components/modals/FolderModal';
import { DeleteFolderDialog } from '../components/modals/DeleteFolderDialog';
import { getFolderPath } from '../utils/folders';
import { MoveModal } from '../components/modals/MoveModal';
import { MoveFolderModal } from '../components/modals/MoveFolderModal';
import { NewChatModal } from '../components/modals/NewChatModal';
import { SpotlightSearchModal } from '../components/modals/SpotlightSearchModal';
import { ImportDocumentModal } from '../components/modals/ImportDocumentModal';
import { AppPages } from './AppPages';
import { useAppRouter } from './router/useAppRouter';
import { useTheme } from './theme/useTheme';

export default function App() {
  const [documents, setDocuments] = useState<Document[]>(getStoredDocuments);
  const [folders, setFolders] = useState<Folder[]>(getStoredFolders);
  const { view: viewState, navigate } = useAppRouter();
  const { theme, setTheme } = useTheme();
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = memoryStorage.getItem('misa_sidebar_width');
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 520) {
          if (parsed === 260) return 280;
          return parsed;
        }
      }
    } catch (e) {}
    return 280;
  });

  // Modals
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [folderModalState, setFolderModalState] = useState<{
    isOpen: boolean;
    folderToEdit?: Folder | null;
    parentFolder?: Folder | null;
    defaultSpace?: SpaceType;
  }>({ isOpen: false });
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newDocumentId, setNewDocumentId] = useState<string | null>(null);

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [moveModalDoc, setMoveModalDoc] = useState<Document | null>(null);
  const [moveModalFolder, setMoveModalFolder] = useState<Folder | null>(null);

  // Toast feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Document CRUD
  const handleUpdateDocument = (updatedDoc: Document) => {
    const latest = getStoredDocuments().find(doc => doc.id === updatedDoc.id);
    if (!latest || latest.isTrash) return;
    const newDocs = upsertDocument({ ...updatedDoc, space: latest.space, folderId: latest.folderId, isFavorite: latest.isFavorite });
    setDocuments(newDocs);
  };

  const handleSoftDeleteDocument = (docId: string) => {
    const newDocs = softDeleteDocument(docId);
    setDocuments(newDocs);
    addToast('Đã chuyển tài liệu vào thùng rác', 'info');

    if (viewState.type === 'document' && viewState.documentId === docId) {
      const remainingDocs = newDocs.filter((d) => !d.isTrash);
      if (remainingDocs.length > 0) {
        navigate({ type: 'document', documentId: remainingDocs[0].id });
      } else {
        navigate({ type: 'library' });
      }
    }
  };

  const handleRestoreDocument = (docId: string) => {
    const newDocs = restoreDocumentFromTrash(docId);
    setDocuments(newDocs);
    addToast('Đã khôi phục tài liệu thành công');
  };

  const handlePermanentDelete = (docId: string) => {
    const newDocs = permanentDeleteDocument(docId);
    setDocuments(newDocs);
    addToast('Đã xóa vĩnh viễn tài liệu', 'info');
  };

  const handleEmptyTrash = () => {
    const newDocs = emptyTrashPermanently();
    setDocuments(newDocs);
    addToast('Đã dọn sạch thùng rác', 'info');
  };

  const handleMoveDocument = (
    docId: string,
    targetFolderId: string | null,
    targetSpace: SpaceType
  ) => {
    const newDocs = moveDocumentToFolderOrSpace(docId, targetFolderId, targetSpace);
    setDocuments(newDocs);
  };

  const handleMoveFolder = (
    folderId: string,
    targetParentId: string | null,
    targetSpace: SpaceType
  ) => {
    try {
      const result = moveFolderToParentOrSpace(folderId, targetParentId, targetSpace);
      setFolders(result.folders);
      setDocuments(result.docs);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Không thể di chuyển thư mục', 'error');
    }
  };

  const handleToggleFavorite = (docId: string) => {
    const newDocs = toggleDocumentFavorite(docId);
    setDocuments(newDocs);
    const target = newDocs.find((d) => d.id === docId);
    if (target?.isFavorite) {
      addToast('Đã thêm vào danh sách yêu thích');
    } else {
      addToast('Đã bỏ khỏi danh sách yêu thích', 'info');
    }
  };

  const handleDuplicateDocument = (docId: string) => {
    const source = documents.find((d) => d.id === docId);
    if (!source) return;
    const newDocId = `doc_${Date.now()}`;
    const newDoc: Document = {
      ...source,
      id: newDocId,
      title: `Bản sao của ${source.title}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: source.blocks.map((b) => ({
        ...b,
        id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      })),
    };
    const newDocs = upsertDocument(newDoc);
    setDocuments(newDocs);
    addToast(`Đã nhân bản "${newDoc.title}"`);
  };

  const handleRenameDocument = (docId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const target = documents.find((d) => d.id === docId);
    if (!target) return;
    const updatedDoc = { ...target, title: newTitle.trim(), updatedAt: new Date().toISOString() };
    const newDocs = upsertDocument(updatedDoc);
    setDocuments(newDocs);
    addToast(`Đã đổi tên thành "${newTitle.trim()}"`);
  };

  // Create new document from template
  const handleCreateFromTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) { addToast('Không tìm thấy mẫu tài liệu', 'error'); return; }
    const newDocId = `doc_${crypto.randomUUID()}`;
    const newDoc: Document = {
      id: newDocId,
      title: tpl.title === 'Ghi chú cá nhân' ? 'Ghi chú không có tiêu đề' : tpl.title,
      icon: '📄',
      space: tpl.space,
      folderId: tpl.space === 'personal' && folders.some(folder => folder.id === 'fld_work' && folder.space === 'personal') ? 'fld_work' : null,
      type: tpl.type,
      tags: [...tpl.tags],
      permission: 'owner',
      isPrivate: tpl.space === 'personal',
      author: {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        avatar: CURRENT_USER.avatar,
        email: CURRENT_USER.email,
        department: CURRENT_USER.department,
      },
      isFavorite: false,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: tpl.createBlocks().map(block => ({ ...block, id: `blk_${crypto.randomUUID()}` })),
    };

    const newDocs = upsertDocument(newDoc);
    if (!getStoredDocuments().some(doc => doc.id === newDocId)) {
      addToast('Không lưu được tài liệu. Bộ nhớ trình duyệt có thể đã đầy.', 'error'); return;
    }
    setDocuments(newDocs);
    navigate({ type: 'document', documentId: newDocId });
    setCurrentRole('owner');
    addToast(`Đã tạo "${newDoc.title}"`);
  };

  const handleImportDocument = (title: string, blocks: Block[], space: SpaceType, folderId: string | null) => {
    const now = new Date().toISOString();
    const imported: Document = {
      id: `doc_${crypto.randomUUID()}`, title, blocks, space, folderId,
      type: 'note', tags: ['Đã nhập'], permission: 'owner', isPrivate: space === 'personal',
      author: { ...CURRENT_USER }, isFavorite: false, isTrash: false, createdAt: now, updatedAt: now,
    };
    const saved = upsertDocument(imported);
    if (!getStoredDocuments().some(doc => doc.id === imported.id)) throw new Error('Không lưu được tài liệu.');
    setDocuments(saved);
    setCurrentRole('owner');
    navigate({ type: 'document', documentId: imported.id });
    setShowImportModal(false);
    addToast(`Đã nhập "${title}"`);
  };

  // Create blank document
  const handleCreateDocument = (space: SpaceType, folderId?: string | null) => {
    const newDocId = `doc_${Date.now()}`;
    const newDoc: Document = {
      id: newDocId,
      title: 'Ghi chú mới',
      icon: '📄',
      space,
      folderId: folderId || null,
      type: 'note',
      tags: [space === 'personal' ? 'Cá nhân' : 'Công ty'],
      permission: 'owner',
      isPrivate: space === 'personal',
      author: {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        avatar: CURRENT_USER.avatar,
        email: CURRENT_USER.email,
        department: CURRENT_USER.department,
      },
      isFavorite: false,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: `blk_${Date.now()}`,
          type: 'paragraph',
          content: '',
        },
      ],
    };

    const newDocs = upsertDocument(newDoc);
    setDocuments(newDocs);
    setNewDocumentId(newDocId);
    navigate({ type: 'document', documentId: newDocId });
    addToast('Đã tạo ghi chú mới');
  };

  // Quick Action: Tạo danh sách công việc
  const handleCreateTaskList = () => {
    const newDocId = `doc_${Date.now()}`;
    const newDoc: Document = {
      id: newDocId,
      title: 'Danh sách công việc',
      icon: '📄',
      space: 'personal',
      folderId: 'fld_work',
      type: 'plan',
      tags: ['Công việc', 'Checklist'],
      permission: 'owner',
      isPrivate: true,
      author: {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        avatar: CURRENT_USER.avatar,
        email: CURRENT_USER.email,
        department: CURRENT_USER.department,
      },
      isFavorite: false,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: `blk_tl_01`,
          type: 'paragraph',
          content: 'Danh sách các nhiệm vụ trọng tâm cần hoàn thành trong tuần.',
        },
        {
          id: `blk_tl_02`,
          type: 'h2',
          content: 'Đầu việc ưu tiên',
        },
        {
          id: `blk_tl_03`,
          type: 'checklist',
          content: 'Nhiệm vụ 1: Hoàn tất tài liệu đặc tả',
          properties: { checked: false },
        },
        {
          id: `blk_tl_04`,
          type: 'checklist',
          content: 'Nhiệm vụ 2: Trao đổi kỹ thuật với đối tác',
          properties: { checked: false },
        },
      ],
    };

    const newDocs = upsertDocument(newDoc);
    setDocuments(newDocs);
    navigate({ type: 'document', documentId: newDocId });
    addToast('Đã tạo danh sách công việc');
  };

  // Folder CRUD
  const handleCreateFolder = (space: SpaceType, parentId?: string | null) => {
    const storedFolders = getStoredFolders();
    const parentFolder = parentId ? storedFolders.find(folder => folder.id === parentId) : null;
    if (parentId && (!parentFolder || parentFolder.space !== space)) { addToast('Không tìm thấy thư mục cha phù hợp.', 'error'); return; }
    const siblings = storedFolders.filter(folder => folder.space === space && (folder.parentId || null) === (parentId || null));
    let name = 'Thư mục mới';
    let suffix = 2;
    while (siblings.some(folder => folder.name === name)) name = `Thư mục mới ${suffix++}`;
    const now = new Date().toISOString();
    const folder: Folder = { id: `fld_${crypto.randomUUID()}`, name, parentId: parentId || null, space, icon: '📁', createdAt: now, updatedAt: now };
    try {
      handleSaveFolder(folder);
      setSidebarCollapsed(false);
      setNewFolderId(folder.id);
    } catch (error) { addToast(error instanceof Error ? error.message : 'Không tạo được thư mục.', 'error'); }
  };

  const handleOpenEditFolder = (folder: Folder) => {
    setFolderModalState({ isOpen: true, defaultSpace: folder.space, folderToEdit: folder });
  };

  const handleSaveFolder = (folder: Folder) => {
    const newFolders = upsertFolder(folder);
    if (!getStoredFolders().some(saved => saved.id === folder.id && saved.name === folder.name && saved.space === folder.space && saved.icon === folder.icon && (saved.parentId || null) === (folder.parentId || null))) {
      throw new Error('Không lưu được thư mục. Bộ nhớ trình duyệt có thể đã đầy.');
    }
    setFolders(newFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find(folder => folder.id === folderId);
    if (folder) setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const result = deleteFolderAndReassign(folderToDelete.id);
    setFolders(result.folders);
    setDocuments(result.docs);
    if (viewState.type === 'folder' && viewState.folderId === folderToDelete.id) {
      const parent = result.folders.find(folder => folder.id === folderToDelete.parentId);
      navigate(parent ? { type: 'folder', folderId: parent.id } : { type: folderToDelete.space === 'personal' ? 'private' : 'company' });
    }
    setFolderToDelete(null);
    addToast('Đã xóa thư mục và chuyển nội dung lên cấp cha.');
  };

  // Active document
  const activeDocument =
    viewState.type === 'document'
      ? documents.find((d) => d.id === viewState.documentId && !d.isTrash)
      : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--ui-surface)] text-[var(--ui-text)] select-none font-sans">
      {/* Full-width Top Header (Navbar) matching MISA AMIS GHI CHÉP */}
      <Header
        theme={theme}
        onThemeChange={setTheme}
        onOpenSearch={() => setIsSpotlightOpen(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onNavigateHome={() => navigate({ type: 'private' })}
      />

      {/* Main Workspace below header */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar matching screenshot */}
      <Sidebar
        documents={documents}
        folders={folders}
        viewState={viewState}
        currentRole={currentRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarWidth={sidebarWidth}
        onWidthChange={setSidebarWidth}
        onNavigate={navigate}
        onCreateDocument={handleCreateDocument}
        onCreateFolder={handleCreateFolder}
        newFolderId={newFolderId}
        onFinishNewFolder={() => setNewFolderId(null)}
        onRenameNewFolder={(folder, name) => { handleSaveFolder({ ...folder, name }); setNewFolderId(null); }}
        onEditFolder={handleOpenEditFolder}
        onDeleteFolder={handleDeleteFolder}
        onRoleChange={setCurrentRole}
        onOpenSpotlight={() => setIsSpotlightOpen(true)}
        onOpenOneAI={() => addToast('Tính năng Hỏi AI (One AI) sắp ra mắt', 'info')}
        onCreateMeetingNote={() => handleCreateFromTemplate('tpl_meeting_minutes')}
        onOpenTemplates={() => navigate({ type: 'templates' })}
        onOpenChat={() => setChatModalOpen(true)}
        onCreateTaskList={handleCreateTaskList}
        onImportDoc={() => setShowImportModal(true)}
        onToggleFavorite={handleToggleFavorite}
        onSoftDeleteDocument={handleSoftDeleteDocument}
        onDuplicateDocument={handleDuplicateDocument}
        onRenameDocument={handleRenameDocument}
        onMoveDocumentRequest={(doc) => setMoveModalDoc(doc)}
        onMoveDocument={handleMoveDocument}
        onMoveFolder={handleMoveFolder}
        onToast={addToast}
      />

      {/* Main View Port */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[var(--ui-surface)]">
        <AppPages view={viewState} documents={documents} folders={folders}
          onNavigate={navigate} onUseTemplate={handleCreateFromTemplate}
          actions={{
            onOpenDocument: documentId => navigate({ type: 'document', documentId }),
            onToggleFavorite: handleToggleFavorite,
            onSoftDeleteDocument: handleSoftDeleteDocument,
            onCreateDocument: handleCreateDocument,
            onOpenTemplates: () => navigate({ type: 'templates' }),
            onNavigatePage: type => navigate({ type }),
            onImportDoc: () => setShowImportModal(true),
            onCreateFolder: handleCreateFolder,
            onEditFolder: handleOpenEditFolder,
            onMoveFolderRequest: (folder) => setMoveModalFolder(folder),
            onDeleteFolder: handleDeleteFolder,
            onRecordAudioNote: () => addToast('Tính năng ghi âm thành ghi chú OneAI đang được kết nối'),
            onDuplicateDocument: handleDuplicateDocument,
            onRenameDocument: handleRenameDocument,
            onMoveDocumentRequest: setMoveModalDoc,
            onMoveDocument: handleMoveDocument,
            onMoveFolder: handleMoveFolder,
            onToast: addToast,
          }}
          editor={{ folders, currentRole, onUpdateDocument: handleUpdateDocument, onNavigate: navigate,
            onSoftDeleteDocument: handleSoftDeleteDocument, onToggleFavorite: handleToggleFavorite,
            onMoveDocument: handleMoveDocument, onToast: addToast, onRoleChange: setCurrentRole,
            autoFocusTitle: viewState.type === 'document' && newDocumentId === viewState.documentId,
            onAutoFocusTitleHandled: () => setNewDocumentId(null) }}
          trash={{ onRestore: handleRestoreDocument, onPermanentDelete: handlePermanentDelete, onEmptyTrash: handleEmptyTrash }}
        />
      </main>
      </div>

      {/* Spotlight Search & Command Palette (Ctrl+K) */}
      <SpotlightSearchModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        documents={documents}
        folders={folders}
        onOpenDocument={(docId) => navigate({ type: 'document', documentId: docId })}
        onCreateNewNote={() => handleCreateDocument('personal', null)}
        onCreateMeetingNote={() => handleCreateFromTemplate('tpl_meeting_minutes')}
        onOpenOneAI={() => addToast('Tính năng Hỏi AI (One AI) sắp ra mắt', 'info')}
        onCreateTaskList={handleCreateTaskList}
        onOpenTemplates={() => navigate({ type: 'templates' })}
      />

      {/* Global Modals */}
      {showImportModal && <ImportDocumentModal folders={folders} onClose={() => setShowImportModal(false)} onImport={handleImportDocument} />}
      <FolderModal
        parentFolder={folderModalState.parentFolder}
        isOpen={folderModalState.isOpen}
        folderToEdit={folderModalState.folderToEdit}
        defaultSpace={folderModalState.defaultSpace}
        onClose={() => setFolderModalState({ isOpen: false })}
        onSaveFolder={handleSaveFolder}
        onToast={addToast}
      />
      {folderToDelete && <DeleteFolderDialog folder={folderToDelete}
        destination={getFolderPath(folderToDelete.parentId, folders) || (folderToDelete.space === 'personal' ? 'Ghi chú của tôi / Thư mục gốc' : 'Tài liệu công ty / Thư mục gốc')}
        noteCount={documents.filter(doc => doc.folderId === folderToDelete.id).length}
        childCount={folders.filter(folder => folder.parentId === folderToDelete.id).length}
        onClose={() => setFolderToDelete(null)} onConfirm={handleConfirmDeleteFolder} />}

      <NewChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        documentTitle={activeDocument?.title}
        folders={folders}
        onToast={addToast}
        onSaveAsDocument={(title, folderId, space, chatLines, isFavorite = false) => {
          const newDocId = `doc_${Date.now()}`;
          const newDoc: Document = {
            id: newDocId,
            title,
            icon: '💬',
            space,
            folderId,
            type: 'note',
            tags: ['Đoạn chat', 'Thảo luận'],
            permission: 'owner',
            isPrivate: space === 'personal',
            author: {
              id: CURRENT_USER.id,
              name: CURRENT_USER.name,
              avatar: CURRENT_USER.avatar,
              email: CURRENT_USER.email,
              department: CURRENT_USER.department,
            },
            isFavorite: !!isFavorite,
            isTrash: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            blocks: [
              {
                id: `blk_c_${Date.now()}_callout`,
                type: 'callout',
                content: `Biên bản đoạn chat thảo luận được lưu trữ vào ${
                  space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty'
                }.`,
                properties: { calloutType: 'info' },
              },
              ...chatLines.map((line, idx) => ({
                id: `blk_c_${Date.now()}_${idx}`,
                type: 'paragraph' as const,
                content: line,
              })),
            ],
          };
          const newDocs = upsertDocument(newDoc);
          setDocuments(newDocs);
          navigate({ type: 'document', documentId: newDocId });
          setChatModalOpen(false);
          if (isFavorite) {
            addToast('Đã lưu đoạn chat và thêm vào mục Yêu thích');
          }
        }}
      />

      {moveModalDoc && (
        <MoveModal
          document={moveModalDoc}
          folders={folders}
          isOpen={!!moveModalDoc}
          onClose={() => setMoveModalDoc(null)}
          onMove={(docId, folderId, space) => {
            handleMoveDocument(docId, folderId, space);
            setMoveModalDoc(null);
          }}
          onToast={addToast}
        />
      )}

      {moveModalFolder && (
        <MoveFolderModal
          folder={moveModalFolder}
          folders={folders}
          isOpen={!!moveModalFolder}
          onClose={() => setMoveModalFolder(null)}
          onMove={(folderId, parentId, space) => {
            handleMoveFolder(folderId, parentId, space);
            setMoveModalFolder(null);
          }}
          onToast={addToast}
        />
      )}

      {/* Notification Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
