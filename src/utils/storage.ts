import { Document, Folder, SpaceType } from '../types';
import { INITIAL_DOCUMENTS, INITIAL_FOLDERS } from '../data/mockData';

const STORAGE_KEYS = {
  DOCUMENTS: 'ghi_chu_noi_bo_documents_v6',
  FOLDERS: 'ghi_chu_noi_bo_folders_v6',
  CURRENT_USER_ROLE: 'ghi_chu_noi_bo_user_role_v6',
};

export const getStoredDocuments = (): Document[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    }
    return JSON.parse(raw);
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
  const folders = getStoredFolders().filter((f) => f.id !== folderId);
  saveStoredFolders(folders);

  // Unassign folder from documents so they become root docs in their space
  const docs = getStoredDocuments().map((doc) =>
    doc.folderId === folderId ? { ...doc, folderId: null, updatedAt: new Date().toISOString() } : doc
  );
  saveStoredDocuments(docs);

  return { folders, docs };
};
