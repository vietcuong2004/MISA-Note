import React, { act } from 'react';
import { before, after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type { Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';

let dom: JSDOM;
let root: Root | undefined;
let App: typeof import('./App')['default'];
let createRoot: typeof import('react-dom/client')['createRoot'];
let getStoredDocuments: typeof import('../utils/storage')['getStoredDocuments'];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost:3000/private', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'navigator', 'localStorage', 'Node', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Event', 'MouseEvent', 'KeyboardEvent']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as unknown as Record<string, unknown>)[key] });
  }
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  ({ createRoot } = await import('react-dom/client'));
  ({ default: App } = await import('./App'));
  ({ getStoredDocuments } = await import('../utils/storage'));
});

afterEach(async () => {
  if (root) { await act(async () => root!.unmount()); root = undefined; }
  localStorage.clear();
});
after(() => dom.window.close());

async function mount(path: string) {
  if (root) await act(async () => root!.unmount());
  window.history.replaceState(null, '', path);
  root = createRoot(document.getElementById('root')!);
  await act(async () => root!.render(<App />));
}

async function click(element: Element | null | undefined) {
  assert(element, 'Expected clickable element to exist');
  await act(async () => { element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
}
const button = (text: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll('button')).find(element => element.textContent?.trim() === text);
const heading = () => document.querySelector('main h1')?.textContent;

async function goHistory(direction: 'back' | 'forward') {
  await act(async () => {
    const changed = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
    window.history[direction]();
    await changed;
  });
}

test('real sidebar and library clicks update both URL and the rendered page', async () => {
  await mount('/private');
  assert.equal(heading(), 'Ghi chú của tôi');
  await click(button('Mẫu ghi chú', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/templates'); assert.equal(heading(), 'Mẫu ghi chú');
  await click(document.getElementById('space-tab-company'));
  assert.equal(window.location.pathname, '/company'); assert.equal(heading(), 'Tài liệu công ty');
  assert.equal(document.getElementById('space-tab-company')?.getAttribute('aria-selected'), 'true');
  await click(button('GHI CHÉP CỦA TÔI'));
  assert.equal(window.location.pathname, '/private'); assert.equal(heading(), 'Ghi chú của tôi');
  await click(button('Thư viện', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/library');
  await click(button('Của tôi', document.querySelector('main')!));
  assert.equal(window.location.pathname, '/private');
});

test('Back and Forward render the page stored in browser history', async () => {
  await mount('/private');
  await click(button('Mẫu ghi chú'));
  await click(document.getElementById('space-tab-company'));
  await goHistory('back'); assert.equal(window.location.pathname, '/templates'); assert.equal(heading(), 'Mẫu ghi chú');
  await goHistory('back'); assert.equal(window.location.pathname, '/private'); assert.equal(heading(), 'Ghi chú của tôi');
  await goHistory('forward'); assert.equal(window.location.pathname, '/templates'); assert.equal(heading(), 'Mẫu ghi chú');
});

test('all library navigation tabs, sidebar lists and folder names have working routes', async () => {
  for (const [label, path] of [['Của tôi', '/private'], ['Công ty', '/company'], ['Được chia sẻ', '/shared'], ['Cuộc họp', '/meetings'], ['Mẫu', '/templates']]) {
    await mount('/library');
    await click(button(label, document.querySelector('main')!));
    assert.equal(window.location.pathname, path);
  }
  await mount('/private');
  await click(button('Công việc', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/folders/fld_work'); assert.equal(heading(), 'Công việc');
  await click(document.getElementById('space-tab-company'));
  await click(button('TÀI LIỆU CÔNG TY'));
  assert.equal(window.location.pathname, '/company');
  for (const [label, path] of [['Chưa phân loại', '/unclassified'], ['Yêu thích', '/favorites']]) {
    await click(Array.from(document.querySelectorAll('aside span')).find(element => element.textContent === label));
    assert.equal(window.location.pathname, path); assert.equal(heading(), label);
  }
  await click(document.querySelector('aside button[title="Thùng rác"]'));
  assert.equal(window.location.pathname, '/trash');
});

test('all five template actions create, persist and open distinct document URLs', async () => {
  const { TEMPLATES } = await import('../data/mockData');
  await mount('/templates');
  const initialCount = getStoredDocuments().length;
  const documentIds = new Set<string>();
  for (const template of TEMPLATES) {
    await click(button('Mẫu ghi chú', document.querySelector('aside')!));
    await click(document.querySelector(`button[aria-label="Sử dụng mẫu ${template.title}"]`));
    assert.match(window.location.pathname, /^\/documents\//);
    const id = decodeURIComponent(window.location.pathname.split('/').pop()!);
    documentIds.add(id);
    const saved = getStoredDocuments().find(doc => doc.id === id)!;
    assert.equal(saved.space, template.space);
    assert.equal(saved.blocks.length, template.createBlocks().length);
    assert.equal((document.querySelector('input[placeholder="Tiêu đề trang..."]') as HTMLInputElement).value, saved.title);
  }
  assert.equal(documentIds.size, 5);
  assert.equal(getStoredDocuments().length, initialCount + 5);
  const documentPath = window.location.pathname;
  await mount(documentPath); // Fresh application mount at a copied document URL.
  assert.equal(window.location.pathname, documentPath);
  assert(document.querySelector('input[placeholder="Tiêu đề trang..."]'));
});

test('direct links and reloads open templates, private/company lists, folders and not-found pages', async () => {
  for (const [path, title] of [['/templates', 'Mẫu ghi chú'], ['/private', 'Ghi chú của tôi'], ['/company', 'Tài liệu công ty'], ['/folders/fld_work', 'Công việc']]) {
    await mount(path); assert.equal(window.location.pathname, path); assert.equal(heading(), title);
    await mount(path); assert.equal(window.location.pathname, path); assert.equal(heading(), title);
  }
  await mount('/documents/missing'); assert.equal(heading(), 'Tài liệu không khả dụng');
  await mount('/folders/missing'); assert.equal(heading(), 'Không tìm thấy thư mục');
  await mount('/no-such-page'); assert.equal(heading(), 'Không tìm thấy trang');
  await mount('/'); assert.equal(window.location.pathname, '/private');
});

test('new notes use the space and folder of the current page', async () => {
  for (const [path, space, folderId] of [['/private', 'personal', null], ['/company', 'company', null], ['/folders/fld_work', 'personal', 'fld_work']] as const) {
    await mount(path);
    await click(button('Ghi chú mới', document.querySelector('main')!));
    const id = decodeURIComponent(window.location.pathname.split('/').pop()!);
    const saved = getStoredDocuments().find(doc => doc.id === id)!;
    assert.equal(saved.space, space); assert.equal(saved.folderId, folderId);
  }
});

test('pending editor changes survive immediate navigation and a fresh document mount', async () => {
  await mount('/documents/doc_week_plan');
  const input = document.querySelector('input[placeholder="Tiêu đề trang..."]') as HTMLInputElement;
  assert(input);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, 'Edited before navigating');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await click(button('Mẫu ghi chú'));
  assert.equal(getStoredDocuments().find(doc => doc.id === 'doc_week_plan')?.title, 'Edited before navigating');
  await mount('/documents/doc_week_plan');
  assert.equal((document.querySelector('input[placeholder="Tiêu đề trang..."]') as HTMLInputElement).value, 'Edited before navigating');
});

test('avatar appearance picker switches all three themes and persists the selection', async () => {
  await mount('/private');
  assert.equal(document.documentElement.dataset.theme, 'default');
  await click(document.querySelector('button[aria-label="Tài khoản cá nhân"]'));
  await click(button('Giao diện', document.getElementById('account-dropdown')!));
  assert.equal(document.querySelectorAll('#appearance-options [role="radio"]').length, 3);
  for (const id of ['blue-yellow', 'graphite-champagne', 'default']) {
    await click(document.getElementById(`theme-option-${id}`));
    assert.equal(document.documentElement.dataset.theme, id);
    assert.equal(localStorage.getItem('misa_ui_theme'), id);
    assert.equal(document.getElementById(`theme-option-${id}`)?.getAttribute('aria-checked'), 'true');
    assert.equal(document.querySelectorAll('#appearance-options [aria-checked="true"]').length, 1);
  }
  await click(document.getElementById('theme-option-graphite-champagne'));
  await click(button('Mẫu ghi chú', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/templates');
  assert.equal(document.documentElement.dataset.theme, 'graphite-champagne');
  await mount('/company');
  assert.equal(document.documentElement.dataset.theme, 'graphite-champagne');
  assert.equal(heading(), 'Tài liệu công ty');
});

test('appearance options support arrow keys, Escape and an invalid saved value', async () => {
  localStorage.setItem('misa_ui_theme', 'invalid-theme');
  await mount('/templates');
  assert.equal(document.documentElement.dataset.theme, 'default');
  await click(document.querySelector('button[aria-label="Tài khoản cá nhân"]'));
  await click(button('Giao diện', document.getElementById('account-dropdown')!));
  const option = document.getElementById('theme-option-default')!;
  await act(async () => { option.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
  assert.equal(document.documentElement.dataset.theme, 'blue-yellow');
  assert.equal(document.activeElement?.id, 'theme-option-blue-yellow');
  await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.equal(document.getElementById('account-dropdown'), null);
  assert.equal(window.location.pathname, '/templates');
});

test('theme palettes preserve the default and apply distinct header/sidebar/button colors', async () => {
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('./theme/themes.css', import.meta.url), 'utf8');
  document.head.append(style);
  try {
    await mount('/private');
    const token = (name: string, target: Element = document.documentElement) => window.getComputedStyle(target).getPropertyValue(name).trim();
    const palettes = [
      ['default', '#1f59b6', '#fafafa', '#1d1d1f'],
      ['blue-yellow', '#285ce6', '#eff5ff', '#1460ff'],
      ['graphite-champagne', '#252a2e', '#252a2e', '#e5c581'],
    ];
    await click(document.querySelector('button[aria-label="Tài khoản cá nhân"]'));
    await click(button('Giao diện', document.getElementById('account-dropdown')!));
    for (const [id, header, sidebar, primary] of palettes) {
      await click(document.getElementById(`theme-option-${id}`));
      assert.equal(token('--ui-header'), header);
      assert.equal(token('--ui-sidebar'), sidebar);
      assert.equal(token('--ui-primary'), primary);
    }
    const sidebar = document.querySelector('.app-sidebar')!;
    assert.equal(token('--ui-text', sidebar), '#f3f3ef');
    assert.equal(token('--ui-text'), '#22282d');
    await click(document.getElementById('theme-option-default'));
    assert.equal(token('--ui-text'), '#1d1d1f');
    assert.equal(token('--ui-surface'), '#ffffff');
  } finally { style.remove(); }
});

async function fillFolderName(name: string) {
  const input = document.getElementById('folder-name') as HTMLInputElement;
  assert(input);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, name);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => { input.closest('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
}

async function nameNewFolder(name: string) {
  const input = document.querySelector('input[aria-label="Tên thư mục mới"]') as HTMLInputElement;
  assert(input);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, name);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => { input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
}

test('folder plus creates nested folders, rename keeps ancestry, and confirmed deletion preserves contents', async () => {
  const { getStoredFolders } = await import('../utils/storage');
  await mount('/private');
  const initialNoteCount = getStoredDocuments().length;
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert(getStoredFolders().some(folder => folder.name === 'Thư mục mới' && folder.parentId === 'fld_work'));
  await nameNewFolder('Sprint A');
  const child = getStoredFolders().find(folder => folder.name === 'Sprint A')!;
  assert.equal(child.parentId, 'fld_work'); assert.equal(child.space, 'personal');
  assert.equal(getStoredDocuments().length, initialNoteCount);
  assert(document.querySelector(`[data-folder-id="fld_work"] [data-folder-id="${child.id}"]`));
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Sprint A"]'));
  await nameNewFolder('Tasks');
  const grandchild = getStoredFolders().find(folder => folder.name === 'Tasks')!;
  assert.equal(grandchild.parentId, child.id);
  assert(document.querySelector(`[data-folder-id="${child.id}"] [data-folder-id="${grandchild.id}"]`));
  await click(document.querySelector('button[aria-label="Đổi tên thư mục Tasks"]'));
  await fillFolderName('Tasks renamed');
  assert.equal(getStoredFolders().find(folder => folder.id === grandchild.id)?.parentId, child.id);
  await click(button('Sprint A', document.querySelector('aside')!));
  assert(button('Tasks renamed', document.querySelector('main')!));
  await click(button('Ghi chú mới', document.querySelector('main')!));
  const noteId = decodeURIComponent(window.location.pathname.split('/').pop()!);
  assert.equal(getStoredDocuments().find(doc => doc.id === noteId)?.folderId, child.id);

  await click(document.querySelector('button[aria-label="Xóa thư mục Sprint A"]'));
  const dialog = document.querySelector('[role="alertdialog"]')!;
  assert(dialog); assert(getStoredFolders().some(folder => folder.id === child.id));
  await click(button('Hủy', dialog));
  assert(getStoredFolders().some(folder => folder.id === child.id));
  await click(document.querySelector('button[aria-label="Xóa thư mục Sprint A"]'));
  await click(button('Xóa thư mục', document.querySelector('[role="alertdialog"]')!));
  assert(!getStoredFolders().some(folder => folder.id === child.id));
  assert.equal(getStoredFolders().find(folder => folder.id === grandchild.id)?.parentId, 'fld_work');
  assert.equal(getStoredDocuments().find(doc => doc.id === noteId)?.folderId, 'fld_work');
  assert.equal(getStoredDocuments().length, initialNoteCount + 1);
  await mount(`/folders/${grandchild.id}`);
  assert.equal(heading(), 'Tasks renamed');
  assert(document.querySelector(`[data-folder-id="fld_work"] [data-folder-id="${grandchild.id}"]`));
});

test('folder deletion can be canceled by X or Escape; deleting the active root navigates to its space', async () => {
  const { getStoredFolders } = await import('../utils/storage');
  await mount('/folders/fld_work');
  await click(document.querySelector('button[aria-label="Xóa thư mục Công việc"]'));
  await click(document.querySelector('button[aria-label="Đóng xác nhận xóa thư mục"]'));
  assert(getStoredFolders().some(folder => folder.id === 'fld_work'));
  await click(document.querySelector('button[aria-label="Xóa thư mục Công việc"]'));
  await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert(!document.querySelector('[role="alertdialog"]'));
  assert(getStoredFolders().some(folder => folder.id === 'fld_work'));
  const originalCount = getStoredDocuments().length;
  await click(document.querySelector('button[aria-label="Xóa thư mục Công việc"]'));
  await click(button('Xóa thư mục', document.querySelector('[role="alertdialog"]')!));
  assert.equal(window.location.pathname, '/private');
  assert(!getStoredFolders().some(folder => folder.id === 'fld_work'));
  assert(!getStoredDocuments().some(doc => doc.folderId === 'fld_work'));
  assert.equal(getStoredDocuments().length, originalCount);
});

test('immediate folder creation keeps saved defaults on Escape and avoids duplicate sibling names', async () => {
  const { getStoredFolders } = await import('../utils/storage');
  await mount('/private');
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  const firstInput = document.querySelector('input[aria-label="Tên thư mục mới"]') as HTMLInputElement;
  assert.equal(firstInput, document.activeElement);
  assert.equal(firstInput.value, 'Thư mục mới');
  await act(async () => { firstInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert(getStoredFolders().some(folder => folder.parentId === 'fld_work' && folder.name === 'Thư mục mới'));
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  const secondInput = document.querySelector('input[aria-label="Tên thư mục mới"]') as HTMLInputElement;
  assert.equal(secondInput.value, 'Thư mục mới 2');
  await act(async () => { secondInput.blur(); });
  assert.equal(document.querySelector('input[aria-label="Tên thư mục mới"]'), null);
  assert(getStoredFolders().some(folder => folder.parentId === 'fld_work' && folder.name === 'Thư mục mới 2'));
  await mount('/private');
  assert(button('Thư mục mới', document.querySelector('aside')!));
  assert(button('Thư mục mới 2', document.querySelector('aside')!));
});

test('clicking tab Của tôi highlights it and plus button creates note above folder Công việc', async () => {
  await mount('/company');
  assert.equal(document.getElementById('space-tab-company')?.getAttribute('aria-selected'), 'true');
  await click(document.getElementById('space-tab-personal'));
  assert.equal(document.getElementById('space-tab-personal')?.getAttribute('aria-selected'), 'true');
  assert.equal(window.location.pathname, '/private');

  const personalPanel = document.getElementById('space-panel-personal')!;
  const createNoteButton = personalPanel.querySelector('button[title="Tạo ghi chú mới"]')!;
  await click(createNoteButton);

  const workFolder = personalPanel.querySelector('[data-folder-id="fld_work"]')!;
  assert(workFolder, 'Expected folder fld_work to exist');
  const noteTextElement = Array.from(personalPanel.querySelectorAll('span')).find(el => el.textContent === 'Ghi chú mới');
  assert(noteTextElement, 'Expected new note to be rendered in personal panel');
  const noteItem = noteTextElement.closest('.group')!;
  assert(workFolder.compareDocumentPosition(noteItem) & Node.DOCUMENT_POSITION_PRECEDING, 'Expected new note to appear above folder Công việc');
});

test('selecting text in block editor renders EditTextDialog with side-by-side submenu and closing on unselect', async () => {
  const initialDoc = getStoredDocuments()[0];
  await mount(`/documents/${initialDoc.id}`);
  const textarea = document.querySelector('#document-editor-container textarea') as HTMLTextAreaElement;
  assert(textarea, 'Expected at least one textarea in document editor');
  assert(textarea.value.length >= 7, 'Expected textarea to contain initial document text');
  await act(async () => {
    textarea.focus();
    textarea.setSelectionRange(0, 7);
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  let dialog = document.querySelector('[aria-label="Định dạng văn bản"]');
  assert(dialog, 'Expected EditTextDialog to open upon text selection');
  assert(dialog.querySelector('input[placeholder="Tìm kiếm hành động…"]'));
  assert(dialog.textContent?.includes('Chuyển thành'));
  assert(dialog.textContent?.includes('Màu'));
  assert(dialog.textContent?.includes('7 ký tự'));
  // Submenu is closed initially; clicking 'Chuyển thành' opens menu cấp 2 side-by-side
  const turnIntoBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.includes('Chuyển thành'));
  assert(turnIntoBtn, 'Expected Chuyển thành button in menu cấp 1');
  await act(async () => {
    turnIntoBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert(dialog.textContent?.includes('Đề mục 1'));
  assert(dialog.textContent?.includes('Danh sách có dấu đầu dòng'));

  // When selection is cleared, dialog closes
  await act(async () => {
    textarea.setSelectionRange(0, 0);
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  dialog = document.querySelector('[aria-label="Định dạng văn bản"]');
  assert.equal(dialog, null, 'Expected EditTextDialog to close when text is no longer highlighted');
});

test('folder and document drag and drop updates hierarchy and persists to storage', async () => {
  const { getStoredFolders, saveStoredFolders } = await import('../utils/storage');
  await mount('/private');

  // Verify initial state: fld_personal and fld_work are roots
  let folders = getStoredFolders();
  const personalFolder = folders.find(f => f.id === 'fld_personal')!;
  const workFolder = folders.find(f => f.id === 'fld_work')!;
  assert.equal(personalFolder.parentId, undefined);
  assert.equal(workFolder.parentId, undefined);

  // 1. Simulate dragging fld_personal onto fld_work row
  const workFolderRow = document.querySelector('[data-folder-id="fld_work"] > div')!;
  assert(workFolderRow, 'Expected fld_work row to exist');

  const createDragEvent = (type: string, data: Record<string, string>) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      dataTransfer: {
        data,
        getData: (key: string) => data[key] || '',
        setData: (key: string, val: string) => { data[key] = val; },
        dropEffect: 'move',
        effectAllowed: 'move',
      },
      preventDefault: () => {},
      stopPropagation: () => {},
    });
    return event;
  };

  await act(async () => {
    workFolderRow.dispatchEvent(createDragEvent('drop', {
      'text/plain': 'folder:fld_personal',
      'text/folder-id': 'fld_personal',
      'application/x-folder-id': 'fld_personal',
    }));
  });

  // Verify fld_personal is now a child of fld_work
  folders = getStoredFolders();
  const updatedPersonal = folders.find(f => f.id === 'fld_personal')!;
  assert.equal(updatedPersonal.parentId, 'fld_work', 'Expected fld_personal to be nested under fld_work');

  // 2. Simulate dragging fld_personal onto root drop area (GHI CHÉP CỦA TÔI)
  const rootPanel = document.querySelector('[data-space-panel="personal"]')!;
  assert(rootPanel, 'Expected data-space-panel="personal" to exist');

  await act(async () => {
    rootPanel.dispatchEvent(createDragEvent('drop', {
      'text/plain': 'folder:fld_personal',
      'text/folder-id': 'fld_personal',
      'application/x-folder-id': 'fld_personal',
    }));
  });

  // Verify fld_personal is promoted back to root (parentId: null)
  folders = getStoredFolders();
  assert.equal(folders.find(f => f.id === 'fld_personal')?.parentId, null, 'Expected fld_personal to be restored to root');

  // 3. Simulate dragging a document onto fld_work folder row
  const { getStoredDocuments } = await import('../utils/storage');
  let docs = getStoredDocuments();
  const testDoc = docs.find(d => d.id === 'doc_1')!;
  assert(testDoc, 'Expected doc_1 to exist');

  await act(async () => {
    workFolderRow.dispatchEvent(createDragEvent('drop', {
      'text/plain': 'doc:doc_1',
      'text/document-id': 'doc_1',
      'application/x-doc-id': 'doc_1',
    }));
  });

  docs = getStoredDocuments();
  assert.equal(docs.find(d => d.id === 'doc_1')?.folderId, 'fld_work', 'Expected doc_1 to be moved into fld_work');
});

