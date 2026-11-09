import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Folder } from '../types';
import { INITIAL_DOCUMENTS } from '../data/mockData';
import { getFolderAncestors, getFolderPath } from './folders';
import { deleteFolderAndReassign, getStoredDocuments, getStoredFolders, moveDocumentToFolderOrSpace, moveFolderToParentOrSpace, saveStoredDocuments, saveStoredFolders, upsertFolder } from './storage';

let failNextFolderWrite = false;
const records = new Map<string, string>();
const folder = (id: string, parentId?: string | null, space: Folder['space'] = 'personal'): Folder =>
  ({ id, name: id, parentId, space, createdAt: '2026-01-01', updatedAt: '2026-01-01' });
const tree = [folder('Root'), folder('Child', 'Root'), folder('Grandchild', 'Child'), folder('Company', null, 'company')];

beforeEach(() => {
  records.clear(); failNextFolderWrite = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failNextFolderWrite && key.includes('folders')) { failNextFolderWrite = false; throw new Error('Quota exceeded'); }
      records.set(key, value);
    },
    removeItem: (key: string) => records.delete(key),
  } });
  saveStoredFolders(tree);
  saveStoredDocuments([
    { ...INITIAL_DOCUMENTS[0], id: 'in-child', space: 'personal', folderId: 'Child' },
    { ...INITIAL_DOCUMENTS[0], id: 'in-grandchild', space: 'personal', folderId: 'Grandchild' },
  ]);
});

test('existing flat folders remain roots and new folders support several levels', () => {
  assert.equal(getStoredFolders()[0].parentId, undefined);
  upsertFolder(folder('Fourth level', 'Grandchild'));
  assert.deepEqual(getFolderAncestors('Fourth level', getStoredFolders()).map(folder => folder.id), ['Root', 'Child', 'Grandchild', 'Fourth level']);
  assert.equal(getFolderPath('Grandchild', tree), 'Root / Child / Grandchild');
});

test('missing parents, cross-space parents and cycles cannot be saved', () => {
  assert.throws(() => upsertFolder(folder('Invalid', 'missing')), /không còn tồn tại/);
  assert.throws(() => upsertFolder(folder('Invalid', 'Company')), /cùng khu vực/);
  assert.throws(() => upsertFolder(folder('Root', 'Grandchild')), /chính nó/);
  assert.throws(() => upsertFolder(folder('Child', 'Child')), /chính nó/);
  assert.equal(getStoredFolders().length, 4);
});

test('deleting one folder preserves its children and notes at the parent level', () => {
  const result = deleteFolderAndReassign('Child');
  assert(!result.folders.some(folder => folder.id === 'Child'));
  assert.equal(result.folders.find(folder => folder.id === 'Grandchild')?.parentId, 'Root');
  assert.equal(result.docs.find(doc => doc.id === 'in-child')?.folderId, 'Root');
  assert.equal(result.docs.find(doc => doc.id === 'in-grandchild')?.folderId, 'Grandchild');
  assert.equal(result.docs.length, 2);
  assert.deepEqual(getStoredFolders(), result.folders);
});

test('deleting a root promotes immediate children and retains deeper relationships', () => {
  const result = deleteFolderAndReassign('Root');
  assert.equal(result.folders.find(folder => folder.id === 'Child')?.parentId, null);
  assert.equal(result.folders.find(folder => folder.id === 'Grandchild')?.parentId, 'Child');
  assert.equal(result.docs.find(doc => doc.id === 'in-child')?.folderId, 'Child');
});

test('a failed write rolls back folder deletion and note reassignment', () => {
  const oldFolders = getStoredFolders(); const oldDocs = getStoredDocuments();
  failNextFolderWrite = true;
  assert.throws(() => deleteFolderAndReassign('Child'), /chưa được xóa/);
  assert.deepEqual(getStoredFolders(), oldFolders);
  assert.deepEqual(getStoredDocuments(), oldDocs);
});

test('moving a document from inside a folder to root updates folderId to null', () => {
  const docs = moveDocumentToFolderOrSpace('in-child', null, 'personal');
  const target = docs.find((d) => d.id === 'in-child');
  assert.equal(target?.folderId, null);
  assert.equal(target?.space, 'personal');
  assert.equal(getStoredDocuments().find((d) => d.id === 'in-child')?.folderId, null);
});

test('moving a folder updates its parentId or promotes it to root', () => {
  // Move Grandchild to Root
  const res1 = moveFolderToParentOrSpace('Grandchild', 'Root', 'personal');
  assert.equal(res1.folders.find((f) => f.id === 'Grandchild')?.parentId, 'Root');

  // Move Grandchild to root level (null parent)
  const res2 = moveFolderToParentOrSpace('Grandchild', null, 'personal');
  assert.equal(res2.folders.find((f) => f.id === 'Grandchild')?.parentId, null);

  // Prevent moving into descendant or self
  assert.throws(() => moveFolderToParentOrSpace('Root', 'Child', 'personal'), /chính nó/);
  assert.throws(() => moveFolderToParentOrSpace('Child', 'Child', 'personal'), /chính nó/);
});
