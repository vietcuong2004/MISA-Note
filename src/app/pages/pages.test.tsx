import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppPages, AppPagesProps } from '../AppPages';
import { CURRENT_USER, INITIAL_DOCUMENTS, INITIAL_FOLDERS } from '../../data/mockData';
import { Document } from '../../types';
import { viewForLocation } from '../router/routes';

const note = (id: string, extra: Partial<Document>): Document => ({
  ...INITIAL_DOCUMENTS[0], id, title: id, author: CURRENT_USER, type: 'note',
  blocks: [{ id: `${id}_block`, type: 'paragraph', content: `Content of ${id}` }],
  tags: [], isTrash: false, isFavorite: false, ...extra,
});
const documents = [
  note('PERSONAL_FOLDER_NOTE', { space: 'personal', folderId: 'fld_work' }),
  note('PERSONAL_ROOT_NOTE', { space: 'personal', folderId: null, isFavorite: true }),
  note('COMPANY_ROOT_NOTE', { space: 'company', folderId: null }),
  note('COMPANY_MEETING_NOTE', { space: 'company', folderId: null, type: 'meeting' }),
  note('TRASHED_NOTE', { space: 'personal', folderId: null, isTrash: true }),
];
const noop = () => {};
const workspace: Omit<AppPagesProps, 'view'> = {
  documents, folders: INITIAL_FOLDERS,
  actions: { onOpenDocument: noop, onToggleFavorite: noop, onSoftDeleteDocument: noop },
  onNavigate: noop, onUseTemplate: noop,
  editor: { folders: INITIAL_FOLDERS, currentRole: 'owner', onUpdateDocument: noop,
    onSoftDeleteDocument: noop, onToggleFavorite: noop, onMoveDocument: noop, onToast: noop },
  trash: { onRestore: noop, onPermanentDelete: noop, onEmptyTrash: noop },
};
const render = (path: string) => renderToStaticMarkup(<AppPages {...workspace} view={viewForLocation(path)} />);

test('session data stays in memory and reinitializes to mock data when runtime stores reset', async () => {
  const { memoryStorage } = await import('../../utils/memoryStorage');
  const { getStoredDocuments, getStoredFolders, saveStoredDocuments, saveStoredFolders } = await import('../../utils/storage');
  const { saveAttachment, readAttachment, clearAttachments } = await import('../../utils/attachments');
  const descriptors = ['localStorage', 'sessionStorage', 'indexedDB'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key] of descriptors) Object.defineProperty(globalThis, key, { configurable: true, get() { throw new Error('Persistent storage must not be accessed'); } });
  memoryStorage.clear(); clearAttachments();
  try {
    assert.deepEqual(getStoredDocuments(), INITIAL_DOCUMENTS);
    assert.deepEqual(getStoredFolders(), INITIAL_FOLDERS);
    const documents = getStoredDocuments(); documents[0].title = 'Changed without saving';
    assert.deepEqual(getStoredDocuments(), INITIAL_DOCUMENTS);
    saveStoredDocuments([]); saveStoredFolders([]);
    memoryStorage.setItem('misa_ui_theme', 'blue-yellow');
    const id = await saveAttachment(new Blob(['temporary upload']));
    assert.equal(await (await readAttachment(id))!.text(), 'temporary upload');
    assert.deepEqual(getStoredDocuments(), []);
    assert.deepEqual(getStoredFolders(), []);
    // Simulate the empty stores created by a new page's JavaScript runtime.
    memoryStorage.clear(); clearAttachments();
    assert.deepEqual(getStoredDocuments(), INITIAL_DOCUMENTS);
    assert.deepEqual(getStoredFolders(), INITIAL_FOLDERS);
    assert.equal(memoryStorage.getItem('misa_ui_theme'), null);
    assert.equal(await readAttachment(id), undefined);
  } finally {
    memoryStorage.clear(); clearAttachments();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('unclassified folders filter root notes by space and recent includes filed notes', () => {
  const personal = render('/library/private/unclassified');
  const company = render('/library/company/unclassified');
  assert(personal.includes('PERSONAL_ROOT_NOTE'));
  assert(!personal.includes('PERSONAL_FOLDER_NOTE') && !personal.includes('COMPANY_ROOT_NOTE'));
  assert(company.includes('COMPANY_ROOT_NOTE') && company.includes('COMPANY_MEETING_NOTE'));
  assert(!company.includes('PERSONAL_ROOT_NOTE') && !company.includes('TRASHED_NOTE'));
  const recent = render('/recent');
  assert(recent.includes('Gần đây') && recent.includes('PERSONAL_FOLDER_NOTE') && recent.includes('COMPANY_ROOT_NOTE'));
  assert(!recent.includes('TRASHED_NOTE'));
});

test('private and company URLs render only their own notes, excluding trash', () => {
  const personal = render('/library/private'); const company = render('/library/company');
  assert(personal.includes('Công việc') && personal.includes('PERSONAL_ROOT_NOTE'));
  assert(!personal.includes('PERSONAL_FOLDER_NOTE'));
  assert(!personal.includes('COMPANY_ROOT_NOTE') && !personal.includes('TRASHED_NOTE'));
  assert(company.includes('COMPANY_ROOT_NOTE') && company.includes('COMPANY_MEETING_NOTE'));
  assert(!company.includes('PERSONAL_FOLDER_NOTE'));
});

test('sidebar space roots use the folder explorer while library tabs keep the library header', () => {
  for (const [path, title, tab] of [['/private', 'Ghi chép của tôi', '/library/private'], ['/company', 'Tài liệu công ty', '/library/company']]) {
    const html = render(path);
    assert(html.includes(`>${title}</h1>`));
    assert(html.includes('data-folder-mode="structure"'));
    assert(html.includes('Sắp xếp thư mục'));
    assert(!html.includes('__space_root</'));
    assert(render(tab).includes('>Thư viện</h1>'));
  }
  const personal = render('/private');
  assert(personal.includes('PERSONAL_ROOT_NOTE') && personal.includes('Công việc'));
  assert(!personal.includes('COMPANY_ROOT_NOTE'));
});

test('folder, favorites, unclassified, meetings and trash URLs select the correct content', () => {
  const folder = render('/folders/fld_work'); assert(folder.includes('PERSONAL_FOLDER_NOTE')); assert(!folder.includes('PERSONAL_ROOT_NOTE'));
  const favorites = render('/favorites'); assert(favorites.includes('PERSONAL_ROOT_NOTE')); assert(!favorites.includes('COMPANY_ROOT_NOTE'));
  const roots = render('/unclassified'); assert(roots.includes('PERSONAL_ROOT_NOTE')); assert(!roots.includes('PERSONAL_FOLDER_NOTE')); assert(!roots.includes('TRASHED_NOTE'));
  const meetings = render('/library/meetings'); assert(meetings.includes('COMPANY_MEETING_NOTE')); assert(!meetings.includes('COMPANY_ROOT_NOTE'));
  const trash = render('/trash'); assert(trash.includes('TRASHED_NOTE')); assert(!trash.includes('PERSONAL_ROOT_NOTE'));
});

test('template URLs render five cards and direct-use actions', () => {
  const html = render('/templates');
  assert.equal((html.match(/<article/g) || []).length, 5);
  assert.equal((html.match(/aria-label="Sử dụng mẫu /g) || []).length, 5);
});

test('document links open the specified editor; missing entities render a recovery page', () => {
  const editor = render('/documents/PERSONAL_ROOT_NOTE');
  assert(editor.includes('PERSONAL_ROOT_NOTE') && editor.includes('textarea'));
  for (const path of ['/documents/missing', '/documents/TRASHED_NOTE', '/folders/missing', '/not-a-page']) {
    assert(render(path).includes('Về Ghi chép của tôi'));
  }
});

test('every default folder in personal and company spaces starts with three mock documents', () => {
  assert.equal(new Set(INITIAL_DOCUMENTS.map(doc => doc.id)).size, INITIAL_DOCUMENTS.length);
  for (const space of ['personal', 'company'] as const) {
    const spaceFolders = INITIAL_FOLDERS.filter(folder => folder.space === space);
    assert.equal(spaceFolders.length, 3);
    const spaceHtml = renderToStaticMarkup(<AppPages {...workspace} documents={INITIAL_DOCUMENTS} view={viewForLocation(space === 'personal' ? '/private' : '/company')} />);
    for (const folder of spaceFolders) {
      const folderDocs = INITIAL_DOCUMENTS.filter(doc => !doc.isTrash && doc.folderId === folder.id && doc.space === space);
      assert.equal(folderDocs.length, 3, `Expected 3 active mock docs in ${folder.id}`);
      const folderHtml = renderToStaticMarkup(<AppPages {...workspace} documents={INITIAL_DOCUMENTS} view={viewForLocation(`/folders/${folder.id}`)} />);
      for (const doc of folderDocs) {
        assert(spaceHtml.includes(`data-folder-document="${doc.id}"`), `Expected ${doc.id} in ${space} root structure`);
        assert(folderHtml.includes(`data-folder-document="${doc.id}"`), `Expected ${doc.id} in folder ${folder.id}`);
      }
    }
  }
});
