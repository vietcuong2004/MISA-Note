import { Document, Folder, SpaceType } from '../types';
import { INITIAL_DOCUMENTS, INITIAL_FOLDERS } from '../data/mockData';
import { validateFolderParent } from './folders';

const STORAGE_KEYS = {
  DOCUMENTS: 'ghi_chu_noi_bo_documents_v8',
  FOLDERS: 'ghi_chu_noi_bo_folders_v8',
  CURRENT_USER_ROLE: 'ghi_chu_noi_bo_user_role_v8',
};

export const getStoredDocuments = (): Document[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    }
    const docs: Document[] = JSON.parse(raw);
    return docs
      .filter((d) => d.id !== 'doc_quick_notes' && d.id !== 'doc_team_meeting_template' && d.title !== 'Ghi chú nhanh' && d.title !== 'Mẫu họp nhóm')
      .map((doc) => ({
        ...doc,
        blocks: doc.blocks?.filter(
          (b) =>
            b.id !== 'blk_u_02' &&
            b.id !== 'b_t1_2' &&
            b.content !== 'Ghi chú này mặc định được giữ ở không gian Cá nhân và riêng tư.'
        ) || [],
      }));
  } catch (err) {
    console.error('Error reading documents from localStorage:', err);
    return INITIAL_DOCUMENTS;
  }
};

export const saveStoredDocuments = (docs: Document[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  } catch (err) {
    console.error('Error saving documents to localStorage:', err);
  }
};

export const getStoredFolders = (): Folder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(INITIAL_FOLDERS));
      return INITIAL_FOLDERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading folders from localStorage:', err);
    return INITIAL_FOLDERS;
  }
};

export const saveStoredFolders = (folders: Folder[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (err) {
    console.error('Error saving folders to localStorage:', err);
  }
};

export const upsertDocument = (document: Document): Document[] => {
  const docs = getStoredDocuments();
  const index = docs.findIndex((d) => d.id === document.id);
  const now = new Date().toISOString();
  const updatedDoc = { ...document, updatedAt: now };

  let updatedList: Document[];
  if (index >= 0) {
    updatedList = [...docs];
    updatedList[index] = updatedDoc;
  } else {
    updatedList = [updatedDoc, ...docs];
  }

  saveStoredDocuments(updatedList);
  return updatedList;
};

export const softDeleteDocument = (docId: string): Document[] => {
  const docs = getStoredDocuments();
  const updatedList = docs.map((doc) =>
    doc.id === docId
      ? { ...doc, isTrash: true, deletedAt: new Date().toISOString() }
      : doc
  );
  saveStoredDocuments(updatedList);
  return updatedList;
};

export const restoreDocumentFromTrash = (docId: string): Document[] => {
  const docs = getStoredDocuments();
  const updatedList = docs.map((doc) =>
    doc.id === docId
      ? { ...doc, isTrash: false, deletedAt: null, updatedAt: new Date().toISOString() }
      : doc
  );
  saveStoredDocuments(updatedList);
  return updatedList;
};

export const permanentDeleteDocument = (docId: string): Document[] => {
  const docs = getStoredDocuments();
  const updatedList = docs.filter((doc) => doc.id !== docId);
  saveStoredDocuments(updatedList);
  return updatedList;
};

export const emptyTrashPermanently = (): Document[] => {
  const docs = getStoredDocuments();
  const updatedList = docs.filter((doc) => !doc.isTrash);
  saveStoredDocuments(updatedList);
  return updatedList;
};

export const moveDocumentToFolderOrSpace = (
  docId: string,
  targetFolderId: string | null,
  targetSpace: SpaceType
): Document[] => {
  const docs = getStoredDocuments();
  const updatedList = docs.map((doc) =>
    doc.id === docId
      ? {
          ...doc,
          folderId: targetFolderId,
          space: targetSpace,
          // If moved to personal, default to private; if company, default to public within org
          isPrivate: targetSpace === 'personal',
          updatedAt: new Date().toISOString(),
        }
      : doc
  );
  saveStoredDocuments(updatedList);
  return updatedList;
};

export const toggleDocumentFavorite = (docId: string): Document[] => {
  const docs = getStoredDocuments();
  const updatedList = docs.map((doc) =>
    doc.id === docId ? { ...doc, isFavorite: !doc.isFavorite } : doc
  );
  saveStoredDocuments(updatedList);
  return updatedList;
};

export const upsertFolder = (folder: Folder): Folder[] => {
  const folders = getStoredFolders();
  validateFolderParent(folder, folders);
  const index = folders.findIndex((f) => f.id === folder.id);
  const now = new Date().toISOString();
  const updatedFolder = { ...folder, updatedAt: now };

  let updatedList: Folder[];
  if (index >= 0) {
    updatedList = [...folders];
    updatedList[index] = updatedFolder;
  } else {
    updatedList = [...folders, updatedFolder];
  }

  saveStoredFolders(updatedList);
  return updatedList;
};

export const deleteFolderAndReassign = (folderId: string): { folders: Folder[]; docs: Document[] } => {
  const previousFolders = getStoredFolders();
  const target = previousFolders.find(folder => folder.id === folderId);
  if (!target) return { folders: previousFolders, docs: getStoredDocuments() };
  const parent = previousFolders.find(folder => folder.id === target.parentId && folder.space === target.space);
  const parentId = parent?.id || null;
  const now = new Date().toISOString();
  const folders = previousFolders.filter(folder => folder.id !== folderId).map(folder =>
    folder.parentId === folderId ? { ...folder, parentId, updatedAt: now } : folder);

  // Delete only the chosen folder; preserve its contents at the parent level.
  const previousDocuments = getStoredDocuments();
  const docs = previousDocuments.map((doc) =>
    doc.folderId === folderId ? { ...doc, folderId: parentId, updatedAt: now } : doc
  );
  // Both records must be persisted before the UI reports a successful deletion.
  const oldFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
  const oldDocuments = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  try {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch {
    try {
      if (oldDocuments !== null) localStorage.setItem(STORAGE_KEYS.DOCUMENTS, oldDocuments);
      if (oldFolders !== null) localStorage.setItem(STORAGE_KEYS.FOLDERS, oldFolders);
    } catch { /* Keep the failure visible so the user can retry. */ }
    throw new Error('Không lưu được thay đổi. Thư mục chưa được xóa; vui lòng thử lại.');
  }

  return { folders, docs };
};

export const moveFolderToParentOrSpace = (
  folderId: string,
  targetParentId: string | null,
  targetSpace: SpaceType
): { folders: Folder[]; docs: Document[] } => {
  const folders = getStoredFolders();
  const target = folders.find((f) => f.id === folderId);
  if (!target) return { folders, docs: getStoredDocuments() };

  const now = new Date().toISOString();
  const updatedFolder: Folder = {
    ...target,
    parentId: targetParentId,
    space: targetSpace,
    updatedAt: now,
  };

  validateFolderParent(updatedFolder, folders);

  const descendants = new Set<string>();
  const collectDescendants = (parentId: string) => {
    folders
      .filter((f) => f.parentId === parentId)
      .forEach((f) => {
        descendants.add(f.id);
        collectDescendants(f.id);
      });
  };
  collectDescendants(folderId);

  const updatedFolders = folders.map((f) => {
    if (f.id === folderId) return updatedFolder;
    if (descendants.has(f.id)) {
      return { ...f, space: targetSpace, updatedAt: now };
    }
    return f;
  });

  const docs = getStoredDocuments();
  const affectedFolderIds = new Set([folderId, ...descendants]);
  const updatedDocs = docs.map((d) => {
    if (d.folderId && affectedFolderIds.has(d.folderId)) {
      return {
        ...d,
        space: targetSpace,
        isPrivate: targetSpace === 'personal',
        updatedAt: now,
      };
    }
    return d;
  });

  saveStoredFolders(updatedFolders);
  saveStoredDocuments(updatedDocs);

  return { folders: updatedFolders, docs: updatedDocs };
};
