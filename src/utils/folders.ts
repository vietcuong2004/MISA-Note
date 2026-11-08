import { Folder } from '../types';

/** Parents are optional so existing flat folders remain root folders. */
export function getFolderAncestors(folderId: string | null | undefined, folders: Folder[]): Folder[] {
  const result: Folder[] = []; const seen = new Set<string>();
  let current = folders.find(folder => folder.id === folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id); result.unshift(current);
    current = folders.find(folder => folder.id === current?.parentId && folder.space === current.space);
  }
  return result;
}

export const getFolderPath = (folderId: string | null | undefined, folders: Folder[]) =>
  getFolderAncestors(folderId, folders).map(folder => folder.name).join(' / ');

export function validateFolderParent(folder: Folder, folders: Folder[]): void {
  if (!folder.parentId) return;
  const parent = folders.find(candidate => candidate.id === folder.parentId);
  if (!parent) throw new Error('Thư mục cha không còn tồn tại.');
  if (parent.space !== folder.space) throw new Error('Thư mục con phải cùng khu vực với thư mục cha.');
  if (getFolderAncestors(parent.id, folders).some(ancestor => ancestor.id === folder.id)) {
    throw new Error('Không thể đặt thư mục vào chính nó hoặc thư mục con của nó.');
  }
}
