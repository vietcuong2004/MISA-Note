import React, { useState, useEffect } from 'react';
import {
  Document,
  Folder,
  SpaceType,
  UserRole,
  ViewState,
} from './types';
import {
  getStoredDocuments,
  getStoredFolders,
  upsertDocument,
  softDeleteDocument,
  restoreDocumentFromTrash,
  permanentDeleteDocument,
  emptyTrashPermanently,
  moveDocumentToFolderOrSpace,
  toggleDocumentFavorite,
  upsertFolder,
  deleteFolderAndReassign,
} from './utils/storage';
import { TEMPLATES, CURRENT_USER } from './data/mockData';
import { Sidebar } from './components/layout/Sidebar';
import { BlockEditor } from './components/editor/BlockEditor';
import { LibraryView } from './components/views/LibraryView';
import { TrashView } from './components/views/TrashView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { FolderModal } from './components/modals/FolderModal';
import { MoveModal } from './components/modals/MoveModal';
import { NewChatModal } from './components/modals/NewChatModal';
import { SpotlightSearchModal } from './components/modals/SpotlightSearchModal';
import { Clock, Star, FileText, SquarePen, Search, HelpCircle, MoreHorizontal } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [viewState, setViewState] = useState<ViewState>({
    type: 'document',
    documentId: 'doc_week_plan',
  });
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('misa_sidebar_width');
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 520) {
          return parsed;
        }
      }
    } catch (e) {}
    return 260;
  });

  // Modals
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [folderModalState, setFolderModalState] = useState<{
    isOpen: boolean;
    folderToEdit?: Folder | null;
    defaultSpace?: SpaceType;
  }>({ isOpen: false });

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [moveModalDoc, setMoveModalDoc] = useState<Document | null>(null);

  // Toast feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial data load
  useEffect(() => {
    const storedDocs = getStoredDocuments();
    const storedFlds = getStoredFolders();
    setDocuments(storedDocs);
    setFolders(storedFlds);

    // Default to 'doc_untitled' if exists, else first document
    const targetDoc = storedDocs.find((d) => d.id === 'doc_untitled' && !d.isTrash) || storedDocs.find((d) => d.id === 'doc_week_plan' && !d.isTrash) || storedDocs[0];
    if (targetDoc) {
      setViewState({ type: 'document', documentId: targetDoc.id });
    }
  }, []);

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
    const newDocs = upsertDocument(updatedDoc);
    setDocuments(newDocs);
  };

  const handleSoftDeleteDocument = (docId: string) => {
    const newDocs = softDeleteDocument(docId);
    setDocuments(newDocs);
    addToast('Đã chuyển tài liệu vào thùng rác', 'info');

    if (viewState.type === 'document' && viewState.documentId === docId) {
      const remainingDocs = newDocs.filter((d) => !d.isTrash);
      if (remainingDocs.length > 0) {
        setViewState({ type: 'document', documentId: remainingDocs[0].id });
      } else {
        setViewState({ type: 'library' });
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
    const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    const newDocId = `doc_${Date.now()}`;
    const newDoc: Document = {
      id: newDocId,
      title: tpl.title === 'Ghi chú cá nhân' ? 'Ghi chú không có tiêu đề' : tpl.title,
      icon: '📄',
      space: tpl.space,
      folderId: tpl.space === 'personal' ? 'fld_work' : null,
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
      blocks: tpl.createBlocks(),
    };

    const newDocs = upsertDocument(newDoc);
    setDocuments(newDocs);
    setViewState({ type: 'document', documentId: newDocId });
    addToast(`Đã tạo "${newDoc.title}"`);
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
    setViewState({ type: 'document', documentId: newDocId });
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
    setViewState({ type: 'document', documentId: newDocId });
    addToast('Đã tạo danh sách công việc');
  };

  // Folder CRUD
  const handleOpenCreateFolder = (space: SpaceType) => {
    setFolderModalState({ isOpen: true, defaultSpace: space, folderToEdit: null });
  };

  const handleOpenEditFolder = (folder: Folder) => {
    setFolderModalState({ isOpen: true, defaultSpace: folder.space, folderToEdit: folder });
  };

  const handleSaveFolder = (folder: Folder) => {
    const newFolders = upsertFolder(folder);
    setFolders(newFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const result = deleteFolderAndReassign(folderId);
    setFolders(result.folders);
    setDocuments(result.docs);
    addToast('Đã xóa thư mục (các tài liệu được chuyển về thư mục gốc)');
  };

  // Active document
  const activeDocument =
    viewState.type === 'document'
      ? documents.find((d) => d.id === viewState.documentId && !d.isTrash)
      : viewState.type === 'meeting_notes'
      ? documents.find((d) => d.id === 'doc_meeting_notes' && !d.isTrash) ||
        documents.find((d) => d.type === 'meeting' && !d.isTrash) ||
        documents[0]
      : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#1D1D1F] select-none font-sans">
      {/* Full-width Top Header (Navbar) matching image_8502d593.png */}
      <header className="h-12 bg-[#1463DF] px-4 flex items-center justify-between text-white shrink-0 z-30 select-none shadow-xs">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/25 flex items-center justify-center text-white shadow-2xs">
            <SquarePen className="w-4.5 h-4.5 stroke-[2] text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">Ghi chép AI</span>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-md mx-4 sm:mx-8">
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-[#0E51BF]/80 hover:bg-[#0E51BF] border border-white/20 text-white/90 text-xs transition-colors shadow-inner cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span className="text-white/80 text-xs truncate">Tìm kiếm ghi chú...</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/15 text-white/90 border border-white/20 shrink-0">
              Ctrl K
            </span>
          </button>
        </div>

        {/* Right: Help & More Options */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Trợ giúp & Phím tắt"
          >
            <HelpCircle className="w-4.5 h-4.5 stroke-[1.75]" />
          </button>
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Tùy chọn khác"
          >
            <MoreHorizontal className="w-4.5 h-4.5 stroke-[1.75]" />
          </button>
        </div>
      </header>

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
        onNavigate={setViewState}
        onCreateDocument={handleCreateDocument}
        onCreateFolder={handleOpenCreateFolder}
        onEditFolder={handleOpenEditFolder}
        onDeleteFolder={handleDeleteFolder}
        onRoleChange={setCurrentRole}
        onOpenSpotlight={() => setIsSpotlightOpen(true)}
        onOpenOneAI={() => addToast('Tính năng Hỏi AI (One AI) sắp ra mắt', 'info')}
        onCreateMeetingNote={() => handleCreateFromTemplate('tpl_meeting_minutes')}
        onOpenTemplates={() => setShowTemplatePicker(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onCreateTaskList={handleCreateTaskList}
        onImportDoc={() => addToast('Sẵn sàng kết nối nhập tệp Markdown / DOCX')}
        onToggleFavorite={handleToggleFavorite}
        onSoftDeleteDocument={handleSoftDeleteDocument}
        onDuplicateDocument={handleDuplicateDocument}
        onRenameDocument={handleRenameDocument}
        onMoveDocumentRequest={(doc) => setMoveModalDoc(doc)}
        onMoveDocument={handleMoveDocument}
        onToast={addToast}
      />

      {/* Main View Port */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {(viewState.type === 'document' || viewState.type === 'meeting_notes') && activeDocument && (
          <BlockEditor
            document={activeDocument}
            folders={folders}
            currentRole={currentRole}
            onUpdateDocument={handleUpdateDocument}
            onSoftDeleteDocument={handleSoftDeleteDocument}
            onToggleFavorite={handleToggleFavorite}
            onMoveDocument={handleMoveDocument}
            onToast={addToast}
            onRoleChange={setCurrentRole}
          />
        )}

        {viewState.type === 'document' && !activeDocument && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <h3 className="text-sm font-semibold text-[#1D1D1F]">Tài liệu không khả dụng</h3>
            <p className="text-xs text-[#86868B]">
              Tài liệu này có thể đã bị xóa hoặc chuyển vào thùng rác.
            </p>
            <button
              onClick={() => handleCreateDocument('personal', null)}
              className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs font-semibold hover:bg-black transition-colors"
            >
              Tạo ghi chú mới
            </button>
          </div>
        )}

        {/* Gần đây view */}
        {viewState.type === 'recent' && (
          <div className="flex-1 overflow-y-auto bg-[#F5F5F7] p-8 md:p-12 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F]">
                  <Clock className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Gần đây</h1>
                  <p className="text-xs text-[#86868B]">Các tài liệu bạn vừa thao tác hoặc cập nhật gần nhất</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden ios-card-shadow">
                {[...documents]
                  .filter((d) => !d.isTrash)
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setViewState({ type: 'document', documentId: doc.id })}
                      className="p-3.5 hover:bg-[#F8F8FA] cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{doc.icon || '📄'}</span>
                        <span className="font-semibold text-[#1D1D1F]">{doc.title}</span>
                      </div>
                      <span className="text-[11px] text-[#86868B] font-mono">
                        {new Date(doc.updatedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Yêu thích view */}
        {viewState.type === 'favorite' && (
          <div className="flex-1 overflow-y-auto bg-[#F5F5F7] p-8 md:p-12 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F]">
                  <Star className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Yêu thích</h1>
                  <p className="text-xs text-[#86868B]">Các tài liệu quan trọng đã được gắn dấu sao</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden ios-card-shadow">
                {documents.filter((d) => d.isFavorite && !d.isTrash).length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#86868B]">
                    Chưa có tài liệu nào được gắn sao yêu thích.
                  </div>
                ) : (
                  documents
                    .filter((d) => d.isFavorite && !d.isTrash)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setViewState({ type: 'document', documentId: doc.id })}
                        className="p-3.5 hover:bg-[#F8F8FA] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{doc.icon || '📄'}</span>
                          <span className="font-semibold text-[#1D1D1F]">{doc.title}</span>
                        </div>
                        <span className="text-[11px] text-[#86868B] font-mono">
                          {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {viewState.type === 'library' && (
          <LibraryView
            documents={documents}
            folders={folders}
            onOpenDocument={(docId) => setViewState({ type: 'document', documentId: docId })}
            onToggleFavorite={handleToggleFavorite}
            onSoftDeleteDocument={handleSoftDeleteDocument}
            onCreateDocument={handleCreateDocument}
            onOpenTemplates={() => setShowTemplatePicker(true)}
            onImportDoc={() => addToast('Sẵn sàng kết nối nhập tệp Markdown / DOCX')}
            onCreateFolder={handleOpenCreateFolder}
            onRecordAudioNote={() => addToast('Tính năng ghi âm thành ghi chú OneAI đang được kết nối')}
            onDuplicateDocument={handleDuplicateDocument}
            onRenameDocument={handleRenameDocument}
            onMoveDocumentRequest={(doc) => setMoveModalDoc(doc)}
            onToast={addToast}
          />
        )}

        {viewState.type === 'trash' && (
          <TrashView
            documents={documents}
            onRestore={handleRestoreDocument}
            onPermanentDelete={handlePermanentDelete}
            onEmptyTrash={handleEmptyTrash}
          />
        )}
      </main>
      </div>

      {/* Spotlight Search & Command Palette (Ctrl+K) */}
      <SpotlightSearchModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        documents={documents}
        folders={folders}
        onOpenDocument={(docId) => setViewState({ type: 'document', documentId: docId })}
        onCreateNewNote={() => handleCreateDocument('personal', null)}
        onCreateMeetingNote={() => handleCreateFromTemplate('tpl_meeting_minutes')}
        onOpenOneAI={() => addToast('Tính năng Hỏi AI (One AI) sắp ra mắt', 'info')}
        onCreateTaskList={handleCreateTaskList}
        onOpenTemplates={() => setShowTemplatePicker(true)}
      />

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-[24px] ios-elevated-shadow border border-[#E5E5EA] w-full max-w-xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">Kho mẫu chuẩn bị sẵn</h3>
                <p className="text-xs text-[#86868B]">Chọn một mẫu để khởi tạo văn bản nhanh</p>
              </div>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="text-xs text-[#86868B] hover:text-[#1D1D1F]"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    handleCreateFromTemplate(tpl.id);
                    setShowTemplatePicker(false);
                  }}
                  className="p-4 rounded-2xl border border-[#E5E5EA] hover:border-[#1D1D1F] hover:-translate-y-0.5 transition-all cursor-pointer bg-white ios-card-shadow flex flex-col justify-between h-36"
                >
                  <div>
                    <span className="text-xl">{tpl.icon}</span>
                    <h4 className="text-xs font-bold text-[#1D1D1F] mt-1.5">{tpl.title}</h4>
                    <p className="text-[11px] text-[#6E6E73] mt-0.5 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#1D1D1F] font-semibold">Dùng mẫu →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <FolderModal
        isOpen={folderModalState.isOpen}
        folderToEdit={folderModalState.folderToEdit}
        defaultSpace={folderModalState.defaultSpace}
        onClose={() => setFolderModalState({ isOpen: false })}
        onSaveFolder={handleSaveFolder}
        onToast={addToast}
      />

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
          setViewState({ type: 'document', documentId: newDocId });
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

      {/* Notification Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
