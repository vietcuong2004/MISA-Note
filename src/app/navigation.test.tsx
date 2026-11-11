import { memoryStorage } from '../utils/memoryStorage';
import { clearAttachments } from '../utils/attachments';
import { layoutConfig } from './layoutConfig';
import React, { act } from 'react';
import { before, after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type { Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { File as NodeFile } from 'node:buffer';

let dom: JSDOM;
let root: Root | undefined;
let App: typeof import('./App')['default'];
let createRoot: typeof import('react-dom/client')['createRoot'];
let getStoredDocuments: typeof import('../utils/storage')['getStoredDocuments'];

before(async () => {
  // Existing scenarios continue to verify that the original sidebar is intact.
  layoutConfig.useSidebar2 = false;
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
  memoryStorage.clear();
  clearAttachments();
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

test('slash previews follow hover and arrow selection without inserting content', async () => {
  const { TEMPLATES } = await import('../data/mockData');
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'preview-note', blocks: [{ id: 'preview-input', type: 'paragraph', content: '' }] }]);
  await mount('/documents/preview-note');
  const input = document.querySelector<HTMLTextAreaElement>('[data-block-id="preview-input"] textarea')!;
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, '/');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(document.querySelector('[data-slash-preview]'), null);
  const hover = async (title: string) => {
    const item = document.querySelector(`[data-slash-command-title="${title}"]`)!;
    assert(item);
    await act(async () => item.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true })));
  };
  for (const template of TEMPLATES) {
    await hover(template.title);
    const preview = document.querySelector<HTMLElement>(`[data-slash-preview="${template.id}"]`)!;
    assert(preview);
    assert(preview.textContent?.includes(template.createBlocks()[0].content));
    assert.equal(input.value, '/');
  }
  await hover('Danh sách gạch đầu dòng');
  assert(document.querySelector('[data-slash-preview="bullet"]')?.textContent?.includes('Chuẩn bị nội dung công việc'));
  await act(async () => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })));
  assert(document.querySelector('[data-slash-preview="numbered"]'));
  await act(async () => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })));
  assert(document.querySelector('[data-slash-preview="bullet"]'));
  await hover('Bảng biểu');
  assert(document.querySelector('[data-slash-preview="table"] table'));
  const menu = document.querySelector('[aria-label="Chèn tiện ích nhanh"]')!;
  menu.getBoundingClientRect = () => new window.DOMRect(600, 100, 384, 400);
  await hover('Hình ảnh');
  const preview = document.querySelector<HTMLElement>('[data-slash-preview="image"]')!;
  assert(preview.textContent?.includes('Thêm hình ảnh'));
  assert.equal(preview.style.left, '308px', 'Preview flips to the left when there is no room on the right');
  const selectedItem = document.querySelector('[data-slash-command-title="Hình ảnh"]')!;
  selectedItem.getBoundingClientRect = () => new window.DOMRect(600, 280, 384, 60);
  preview.getBoundingClientRect = () => new window.DOMRect(308, 0, 280, 200);
  await act(async () => window.dispatchEvent(new window.Event('resize')));
  assert.equal(preview.style.top, '210px', 'Preview center aligns with the selected item center');
  await act(async () => {
    preview.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    preview.querySelector('[data-command-preview-content]')!.dispatchEvent(new window.Event('scroll', { bubbles: true }));
  });
  assert(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'));
  assert.equal(input.value, '/');
  const imageItem = document.querySelector('[data-slash-command-title="Hình ảnh"]')!;
  await act(async () => {
    imageItem.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    preview.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    await new Promise(resolve => setTimeout(resolve, 220));
  });
  assert(document.querySelector('[data-slash-preview]'), 'Preview stays open when crossing the gap to scroll its content');
  await act(async () => {
    preview.querySelector('[data-command-preview-content]')!.dispatchEvent(new window.Event('scroll', { bubbles: true }));
  });
  assert(document.querySelector('[data-slash-preview]'));
  await act(async () => {
    preview.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    await new Promise(resolve => setTimeout(resolve, 220));
  });
  assert.equal(document.querySelector('[data-slash-preview]'), null);
  assert(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'));
});

test('slash template suggestions insert all five reusable templates into the current document', async () => {
  const { TEMPLATES } = await import('../data/mockData');
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  for (const template of TEMPLATES) {
    saveStoredDocuments([{ ...base, id: 'inline-template', title: 'Tài liệu đang viết', blocks: [
      { id: 'before-template', type: 'paragraph', content: 'Nội dung trước mẫu' },
      { id: 'template-input', type: 'paragraph', content: '' },
      { id: 'after-template', type: 'paragraph', content: 'Nội dung sau mẫu' },
    ] }]);
    await mount('/documents/inline-template');
    const input = document.querySelector<HTMLTextAreaElement>('[data-block-id="template-input"] textarea')!;
    await act(async () => {
      input.focus();
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, '/');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const group = document.querySelector('[role="group"][aria-label="Gợi ý template"]')!;
    assert.equal(group.querySelectorAll('[role="option"]').length, 5);
    await click(group.querySelector(`[data-slash-command-title="${template.title}"]`));
    assert.equal(window.location.pathname, '/documents/inline-template');
    assert.equal(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'), null);
    await mount('/private');
    const saved = getStoredDocuments().find(doc => doc.id === 'inline-template')!;
    assert.equal(saved.title, 'Tài liệu đang viết');
    assert.equal(saved.blocks[0].content, 'Nội dung trước mẫu');
    assert.equal(saved.blocks.at(-1)?.content, 'Nội dung sau mẫu');
    assert.deepEqual(saved.blocks.slice(1, -1).map(block => block.type), template.createBlocks().map(block => block.type));
    assert.equal(new Set(saved.blocks.map(block => block.id)).size, saved.blocks.length);
    assert(!saved.blocks.some(block => block.content === '/'));
  }
});

test('share dialog adds employees from search and directory, saves roles and reopens session settings', async () => {
  await mount('/documents/doc_personal_production_meeting');
  const main = document.querySelector('main')!;
  await click(button('Chia sẻ', main));
  let dialog = document.querySelector('[aria-label="Chia sẻ tài liệu"]')!;
  assert(dialog.textContent?.includes('Những người có quyền truy cập'));
  const search = dialog.querySelector<HTMLInputElement>('[aria-label="Tìm nhân viên"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(search, 'Quỳnh Anh');
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await click(document.querySelector('[aria-label="Danh sách nhân viên"] [role="option"]'));
  await click(button('Thêm', dialog));
  const setValue = async (label: string, value: string) => {
    if (label === 'Quyền qua liên kết' || label.startsWith('Quyền của ')) {
      await click(dialog.querySelector(`[aria-label="${label}"]`));
      await click(document.querySelector(`[aria-label="Vai trò"] [data-value="${value}"]`));
      return;
    }
    const select = dialog.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`) !;
    assert(select);
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!.call(select, value);
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  };
  await setValue('Quyền của Phạm Quỳnh Anh', 'viewer');
  const directoryButton = button('Danh bạ', dialog)!;
  directoryButton.getBoundingClientRect = () => new window.DOMRect(650, 210, 100, 44);
  await click(directoryButton);
  const directoryPopup = document.querySelector<HTMLElement>('[data-employee-picker-popover="directory"]')!;
  assert.equal(directoryPopup.style.left, '650px');
  assert.equal(directoryPopup.style.top, '262px');
  await click(Array.from(document.querySelectorAll('[aria-label="Danh sách nhân viên"] [role="option"]')).find(item => item.textContent?.includes('Đặng Tuấn Kiệt')));
  await click(button('Thêm', dialog));
  assert(dialog.querySelector('[aria-label="Quyền của Đặng Tuấn Kiệt"]'));
  await setValue('Quyền truy cập chung', 'link');
  await setValue('Quyền qua liên kết', 'commenter');
  await click(button('Xong', dialog));
  assert.equal(document.querySelector('[aria-label="Chia sẻ tài liệu"]'), null);
  await click(button('Chia sẻ', main));
  dialog = document.querySelector('[aria-label="Chia sẻ tài liệu"]')!;
  assert.equal(dialog.querySelector('[aria-label="Quyền của Phạm Quỳnh Anh"]')?.getAttribute('data-value'), 'viewer');
  assert.equal(dialog.querySelector('[aria-label="Quyền qua liên kết"]')?.getAttribute('data-value'), 'commenter');
  assert(dialog.querySelector('[aria-label="Quyền của Đặng Tuấn Kiệt"]'));
  await setValue('Quyền của Phạm Quỳnh Anh', 'remove');
  assert.equal(dialog.querySelector('[aria-label="Quyền của Phạm Quỳnh Anh"]'), null);
  await click(dialog.querySelector('[aria-label="Đóng chia sẻ"]'));
});

test('favorite production minutes opens in personal space and company notes have no favorite action', async () => {
  layoutConfig.useSidebar2 = true;
  try {
    await mount('/private');
    const favorites = document.querySelector('[aria-label="Danh sách yêu thích"]')!;
    assert.equal(favorites.querySelector('[data-sidebar-document="doc_odt_meeting_20261026"]'), null);
    await click(favorites.querySelector('[data-sidebar-document="doc_personal_production_meeting"]'));
    assert.equal(window.location.pathname, '/documents/doc_personal_production_meeting');
    assert.equal(document.querySelector('[aria-label="Không gian tài liệu"]')?.getAttribute('data-space'), 'personal');
    assert(getStoredDocuments().find(doc => doc.id === 'doc_personal_production_meeting')?.isPrivate);
    await mount('/documents/doc_odt_meeting_20261026');
    const main = document.querySelector('main')!;
    assert.equal(main.querySelector('[title="Thêm vào yêu thích"]'), null);
    await click(main.querySelector('[title="Tùy chọn khác"]'));
    assert(!main.querySelector('[aria-label="Thao tác tài liệu"]')?.textContent?.includes('Yêu thích'));
  } finally { layoutConfig.useSidebar2 = false; }
});

test('slash command shortcuts preserve text and insert media after nonempty blocks', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'shortcuts-note', blocks: [{ id: 'shortcut-block', type: 'paragraph', content: 'Giữ nguyên nội dung' }] }]);
  await mount('/documents/shortcuts-note');
  const input = () => document.querySelector<HTMLTextAreaElement>('[data-block-id="shortcut-block"] textarea')!;
  const editable = input();
  Object.defineProperty(editable, 'scrollHeight', { configurable: true, get: () => editable.classList.contains('text-2xl') ? 64 : 24 });
  const press = async (code: string, key: string, shift = false) => {
    await act(async () => {
      input().focus();
      input().dispatchEvent(new window.KeyboardEvent('keydown', { key, code, ctrlKey: true, altKey: !shift, shiftKey: shift, bubbles: true, cancelable: true }));
    });
  };
  await press('Digit1', '1');
  assert.equal(input().value, 'Giữ nguyên nội dung');
  assert(input().classList.contains('text-2xl'));
  assert.equal(input().style.height, '64px', 'Changing block type must recalculate height even when text stays unchanged');
  await press('Digit7', '&', true);
  assert(document.querySelector('[data-list-kind="numbered"]'));
  assert.equal(input().value, 'Giữ nguyên nội dung');
  await press('KeyI', 'i');
  assert(document.querySelector('[aria-label="Chọn hình ảnh"]'));
  assert.equal(input().value, 'Giữ nguyên nội dung');
  await mount('/private');
  const saved = getStoredDocuments().find(doc => doc.id === 'shortcuts-note')!;
  assert.equal(saved.blocks[0].type, 'numbered');
  assert.equal(saved.blocks[1].type, 'image');
});

test('library tabs preserve the sidebar workspace in both sidebar variants', async () => {
  try {
    for (const newSidebar of [false, true]) {
      layoutConfig.useSidebar2 = newSidebar;
      await mount('/private');
      const workspace = () => newSidebar ? document.querySelector('[role="combobox"][aria-label="Không gian tài liệu"]')?.getAttribute('data-space')
        : document.querySelector('[role="tab"][aria-selected="true"]')?.id.replace('space-tab-', '');
      const openLibrary = async () => click(document.querySelector('aside button[aria-label="Thư viện"]'));
      await openLibrary();
      await click(button('Công ty', document.querySelector('main')!));
      assert.equal(window.location.pathname, '/library/company');
      assert.equal(workspace(), 'personal');
      if (newSidebar) {
        await click(document.querySelector('[role="combobox"][aria-label="Không gian tài liệu"]'));
        await click(document.querySelector('[role="option"][data-space="company"]'));
      } else await click(document.getElementById('space-tab-company'));
      assert.equal(workspace(), 'company');
      await openLibrary();
      for (const label of ['Của tôi', 'Công ty', 'Được chia sẻ', 'Gần đây', 'Tất cả']) {
        await click(button(label, document.querySelector('main')!));
        assert.equal(workspace(), 'company');
      }
    }
  } finally { layoutConfig.useSidebar2 = false; }
});

test('favorites uses folder explorer layout and removes documents when unstarred', async () => {
  await mount('/favorites');
  const main = document.querySelector('main')!;
  assert.equal(heading(), 'Yêu thích');
  assert(main.querySelector('[aria-label="Đường dẫn thư mục"]'));
  assert(main.querySelector('[data-folder-mode="structure"]'));
  assert(main.querySelector('[data-folder-document="doc_personal_production_meeting"]'));
  assert.equal(main.querySelector('[data-folder-document="doc_week_plan"]'), null);
  assert(main.querySelector('[data-folder-entry="fld_work"]'));
  assert.equal(main.querySelector('[data-folder-entry="fld_projects"]'), null);
  for (const [label, mode] of [['Lưới', 'grid'], ['Danh sách', 'list'], ['Structure', 'structure']]) {
    await click(main.querySelector(`[aria-label="Dạng ${label}"]`));
    assert(main.querySelector(`[data-folder-mode="${mode}"]`));
  }
  await click(main.querySelector('[data-folder-document] button[aria-label^="Tùy chọn tài liệu"]'));
  await click(button('Xóa khỏi mục Yêu thích'));
  assert(!getStoredDocuments().find(doc => doc.id === 'doc_personal_production_meeting')?.isFavorite);
  assert(main.textContent?.includes('Chưa có tài liệu nào được gắn sao yêu thích.'));
});

test('account appearance menu switches sidebar variants without changing the current document', async () => {
  await mount('/documents/doc_odt_meeting_20261026');
  await click(document.querySelector('[aria-label="Tài khoản cá nhân"]'));
  await click(button('Giao diện', document.getElementById('account-dropdown')!));
  await click(document.querySelector('[role="radio"][aria-label="Sidebar2"]'));
  assert.equal(document.querySelectorAll('aside').length, 1);
  assert.equal(document.querySelector('aside')?.getAttribute('data-sidebar-version'), '2');
  assert.equal(window.location.pathname, '/documents/doc_odt_meeting_20261026');
  assert.equal(document.querySelector('[aria-label="Sidebar2"]')?.getAttribute('aria-checked'), 'true');
  await click(document.querySelector('[role="radio"][aria-label="Sidebar1"]'));
  assert.equal(document.querySelectorAll('aside').length, 1);
  assert.equal(document.querySelector('aside')?.getAttribute('data-sidebar-version'), null);
  assert(document.querySelector('[id="space-tab-company"]'));
  assert.equal(window.location.pathname, '/documents/doc_odt_meeting_20261026');
  assert.equal(memoryStorage.getItem('misa_sidebar_variant'), '1');
});

test('Sidebar2 switches workspaces, preserves folder actions and keeps only one sidebar mounted', async () => {
  layoutConfig.useSidebar2 = true;
  try {
    const { getStoredFolders, saveStoredFolders } = await import('../utils/storage');
    const initialFolders = getStoredFolders();
    const parent = initialFolders.find(folder => folder.id === 'fld_work')!;
    saveStoredFolders([...initialFolders,
      { ...parent, id: 'nested-default', name: 'Thư mục con', parentId: parent.id },
      { ...parent, id: 'deep-default', name: 'Thư mục cháu', parentId: 'nested-default' },
    ]);
    await mount('/private');
    let sidebar = document.querySelector('aside')!;
    assert.equal(document.querySelectorAll('aside').length, 1);
    assert.equal(sidebar.dataset.sidebarVersion, '2');
    assert.equal(sidebar.querySelector('[role="tablist"]'), null);
    assert.equal(sidebar.querySelector('[id^="space-tab-"]'), null);
    let select = sidebar.querySelector<HTMLButtonElement>('[aria-label="Không gian tài liệu"]')!;
    await click(select);
    assert.deepEqual(Array.from(sidebar.querySelectorAll('[role="option"]')).map(option => option.getAttribute('data-space')), ['personal', 'company']);
    assert.equal(sidebar.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('data-space'), 'personal');
    await act(async () => sidebar.querySelector('[role="listbox"]')!.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(sidebar.querySelector('[role="listbox"]'), null);
    assert.equal(select.dataset.space, 'personal');
    const headerRow = select.parentElement!.parentElement!;
    const headerContainer = headerRow.parentElement!;
    assert.equal(sidebar.style.width, '320px');
    assert(headerContainer.className.includes('p-2'));
    assert(headerContainer.className.includes('shrink-0'));
    assert(headerRow.className.includes('gap-2'));
    assert(select.parentElement!.className.includes('flex-1'));
    assert(select.parentElement!.className.includes('min-w-0'));
    assert(!select.parentElement!.className.includes('w-48'));
    assert(!select.parentElement!.className.includes('mr-auto'));
    assert.equal(headerRow.lastElementChild?.getAttribute('title'), 'Thu gọn thanh bên');
    assert(headerRow.lastElementChild?.className.includes('shrink-0'));
    assert(headerRow.lastElementChild?.className.includes('w-9'));
    const createButton = sidebar.querySelector<HTMLButtonElement>('button[title="Tạo tài liệu"]')!;
    const folderButton = sidebar.querySelector<HTMLButtonElement>('button[title="Tạo thư mục"]')!;
    assert.equal(createButton.textContent?.trim(), 'Tạo tài liệu');
    assert.equal(folderButton.textContent?.trim(), 'Tạo thư mục');
    assert.equal(sidebar.querySelector('button[title="Hỏi AI"]'), null);
    assert.equal(headerRow.children[0], select.parentElement);
    const actionRow = createButton.parentElement!.parentElement!;
    assert.notEqual(actionRow, headerRow);
    assert(actionRow.className.includes('mt-2'));
    assert(actionRow.className.includes('gap-1.5'));
    assert(createButton.parentElement!.className.includes('flex-1'));
    assert(folderButton.parentElement!.className.includes('flex-1'));
    assert(createButton.className.includes('w-full'));
    assert(folderButton.className.includes('w-full'));
    assert(createButton.className.includes('px-3'));
    assert(folderButton.className.includes('px-3'));
    assert.equal(actionRow.children[0], createButton.parentElement);
    assert.equal(actionRow.children[1], folderButton.parentElement);
    assert.equal(actionRow.lastElementChild?.getAttribute('title'), 'Thao tác nhanh khác');
    assert(actionRow.lastElementChild?.className.includes('w-9'));
    await click(actionRow.lastElementChild);
    const quickMenu = sidebar.querySelector('#quick-action-dialog')!;
    assert.deepEqual(
      Array.from(quickMenu.querySelectorAll('button:not([aria-label="Đóng thao tác nhanh"])')).map((btn) => btn.textContent?.trim()),
      ['Ghi chú cá nhân', 'Biên bản cuộc họp', 'Kế hoạch công việc', 'Kế hoạch tuần', 'Tài liệu nội bộ']
    );
    await click(quickMenu.querySelector('button[aria-label="Đóng thao tác nhanh"]'));
    const resize = async (from: number, to: number) => {
      const handle = sidebar.querySelector('[title^="Kéo sang trái/phải"]')!;
      await act(async () => handle.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, clientX: from })));
      await act(async () => document.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: to })));
      await act(async () => document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true })));
    };
    await resize(320, 500);
    assert.equal(createButton.querySelector('span')?.classList.contains('sr-only'), false);
    assert.equal(folderButton.querySelector('span')?.classList.contains('sr-only'), false);
    await resize(500, 200);
    assert.equal(createButton.querySelector('span')?.classList.contains('sr-only'), true);
    assert.equal(folderButton.querySelector('span')?.classList.contains('sr-only'), true);
    assert.equal(select.parentElement!.querySelector('[aria-hidden="true"] span'), null);
    assert.equal(select.title, 'Ghi chép của tôi');
    assert(!sidebar.textContent?.includes('Gần đây'));
    assert(sidebar.textContent?.includes('YÊU THÍCH'));
    const favoriteToggle = sidebar.querySelector('[aria-label="Thu gọn hoặc mở mục yêu thích"]')!;
    await click(favoriteToggle);
    assert.equal(sidebar.querySelector('[aria-label="Danh sách yêu thích"]'), null);
    await click(favoriteToggle);
    assert(sidebar.querySelector('[aria-label="Danh sách yêu thích"]'));
    assert(sidebar.textContent?.includes('TÀI LIỆU CỦA TÔI'));
    assert(sidebar.querySelector('[data-folder-id="deep-default"]'));
    assert.equal(sidebar.querySelector('[aria-label="Thu gọn thư mục Thư mục con"]')?.getAttribute('aria-expanded'), 'true');
    assert.equal(sidebar.querySelector('[aria-label="Mở thư mục Thư mục cháu"]')?.getAttribute('aria-expanded'), 'false');
    assert.equal(sidebar.querySelector('[aria-label="Mở thư mục Cá nhân"]')?.getAttribute('aria-expanded'), 'false');
    const favorites = sidebar.querySelector('[aria-label="Danh sách yêu thích"]')!;
    assert(favorites.querySelector('[data-sidebar-document="doc_personal_production_meeting"]'));
    assert.equal(favorites.querySelector('[data-sidebar-document="doc_personal_meeting_minutes"]'), null);
    assert(favorites.classList.contains('max-h-[178px]'));
    assert(favorites.classList.contains('overflow-y-auto'));
    assert(sidebar.querySelector('[data-space-panel="personal"]'));
    assert.equal(sidebar.querySelector('[data-space-panel="company"]'), null);
    assert(!select.closest('[data-sidebar2-scroll]'));
    const choose = async (space: string) => {
      await click(select);
      await click(sidebar.querySelector(`[role="option"][data-space="${space}"]`));
    };
    assert(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]'));
    await click(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]'));
    await click(sidebar.querySelector('[data-folder-id="fld_work"] span[role="button"]'));
    assert.equal(window.location.pathname, '/folders/fld_work');
    assert(sidebar.querySelector('[aria-label="Mở thư mục Công việc"]'), 'Folder title navigation must not expand children');
    await click(sidebar.querySelector('[aria-label="Mở thư mục Công việc"]'));
    assert.equal(window.location.pathname, '/folders/fld_work');
    assert(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]'));
    await click(sidebar.querySelector('[data-folder-id="fld_work"] span[role="button"]'));
    assert(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]'), 'Title navigation must not collapse an expanded folder');
    assert.equal(sidebar.querySelector('[data-folder-id="fld_work"] span[role="button"]')?.getAttribute('title'), 'Công việc');
    await choose('company');
    assert.equal(window.location.pathname, '/company');
    assert.equal(heading(), 'Tài liệu công ty');
    assert.equal(sidebar.querySelector('[data-space-panel="personal"]'), null);
    assert(!sidebar.textContent?.includes('Gần đây') && !sidebar.textContent?.includes('YÊU THÍCH'));
    assert(sidebar.querySelector('[data-folder-id="fld_projects"]'));
    assert(sidebar.querySelector('[aria-label="Mở thư mục Dự án"]'));
    await click(sidebar.querySelector('[aria-label="Mở thư mục Dự án"]'));
    assert(sidebar.querySelector(`[aria-label="Tùy chọn ${getStoredDocuments().find(doc => doc.id === 'doc_odt_meeting_20261026')!.title}"]`));
    await click(sidebar.querySelector('[title="Tạo tài liệu công ty mới"]'));
    await click(button('Tạo tài liệu', sidebar));
    const created = getStoredDocuments().find(doc => window.location.pathname === `/documents/${doc.id}`)!;
    assert.equal(created.space, 'company');
    assert.equal(created.folderId, null);
    await choose('personal');
    assert.equal(window.location.pathname, '/private');
    assert.equal(heading(), 'Ghi chép của tôi');
    await click(sidebar.querySelector('[title="Thu gọn thanh bên"]'));
    assert.equal(document.querySelectorAll('aside').length, 1);
    assert.equal(document.querySelectorAll('aside button').length, 1);
    assert(document.querySelector('aside button[title="Mở rộng thanh bên"] .lucide-chevrons-right'));
    await click(document.querySelector('aside [title="Mở rộng thanh bên"]'));
    sidebar = document.querySelector('aside')!;
    select = sidebar.querySelector<HTMLButtonElement>('[aria-label="Không gian tài liệu"]')!;
    assert.equal(select.dataset.space, 'personal');
    await mount('/documents/doc_odt_meeting_20261026');
    assert.equal(document.querySelector<HTMLButtonElement>('aside [role="combobox"]')?.dataset.space, 'company');
    assert.equal(document.querySelector('aside [data-space-panel="personal"]'), null);
  } finally { layoutConfig.useSidebar2 = false; }
});

test('collapsing Sidebar leaves only the expand chevron button', async () => {
  await mount('/private');
  await click(document.querySelector('aside [title="Thu gọn thanh bên"]'));
  assert.equal(document.querySelectorAll('aside').length, 1);
  assert.equal(document.querySelectorAll('aside button').length, 1);
  assert.equal(document.querySelector('aside')?.textContent, '');
  assert(document.querySelector('aside button[title="Mở rộng thanh bên"] .lucide-chevrons-right'));
  await click(document.querySelector('aside [title="Mở rộng thanh bên"]'));
  assert(document.querySelector('aside [title="Thu gọn thanh bên"]'));
});

test('link dialog saves display text and renders a plain underlined hyperlink', async () => {
  const { LinkBlock } = await import('../components/editor/LinkBlock');
  let block: import('../types').Block = { id: 'new-link', type: 'link', content: '' };
  root = createRoot(document.getElementById('root')!);
  const render = () => root!.render(<LinkBlock block={block} readOnly={false} onChange={(content, properties) => { block = { ...block, content, properties }; render(); }} />);
  await act(async () => render());
  for (const [label, value] of [['URL trang', 'https://example.com/guide'], ['Nội dung hiển thị', 'Xem hướng dẫn']]) {
    const input = document.querySelector(`[aria-label="${label}"]`)!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  }
  await act(async () => document.querySelector('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  const link = document.querySelector('a')!;
  assert.equal(link.textContent, 'Xem hướng dẫn');
  assert.equal(link.href, 'https://example.com/guide');
  assert(link.classList.contains('underline'));
  assert.equal(document.querySelector('form'), null);
  assert.equal(document.querySelector('button'), null);
});

test('ODT sample renders links inside list text and keeps them aligned after editing', async () => {
  await mount('/documents/doc_odt_meeting_20261026');
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-linked-text] a');
  assert.equal(links.length, 7);
  assert.equal(links[0].textContent, 'tại đây');
  assert(links[0].href.startsWith('https://amis.misa.vn/'));
  assert(links[0].classList.contains('underline'));
  assert.equal(document.querySelectorAll('main a').length, 7);
  const parent = links[0].closest('[data-list-item]')!;
  const input = parent.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Mới: ' + input.value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(parent.querySelector('a')?.textContent, 'tại đây');
  assert(parent.querySelector('[data-linked-text]')?.textContent?.startsWith('Mới: '));
});

test('editor width toggle switches between reading and wide content without changing text', async () => {
  const doc = getStoredDocuments().find(item => !item.isTrash && item.space === 'personal')!;
  const origPrint = window.print;
  let printCalls = 0;
  Object.defineProperty(window, 'print', {
    configurable: true,
    writable: true,
    value: () => {
      printCalls += 1;
    },
  });

  try {
    await mount(`/documents/${doc.id}`);
    const headerActions = document.querySelector<HTMLElement>('[data-doc-header-actions]')!;
    assert(headerActions);
    const orderedButtons = Array.from(headerActions.querySelectorAll<HTMLButtonElement>('button')).map(
      (btn) => btn.textContent?.trim() || btn.getAttribute('title') || ''
    );
    assert.deepEqual(orderedButtons, ['Xem toàn màn hình', 'Chia sẻ', 'In', 'Tùy chọn khác']);
    assert.equal(button('Đã yêu thích', headerActions), undefined);
    assert.equal(button('Yêu thích', headerActions), undefined);

    const toggle = document.querySelector<HTMLButtonElement>('button[aria-label="Xem toàn màn hình"]')!;
    const content = document.querySelector<HTMLElement>('[data-content-width]')!;
    const initialText = document.querySelector<HTMLTextAreaElement>('#document-editor-container textarea')?.value;
    assert.equal(toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(toggle.textContent, 'Xem toàn màn hình');
    assert(content.classList.contains('px-[5%]'));
    assert(!content.firstElementChild?.classList.contains('max-w-2xl'));

    await click(toggle);
    assert.equal(toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(toggle.textContent, 'Vừa đọc');
    assert(content.firstElementChild?.classList.contains('max-w-2xl'));
    assert(content.firstElementChild?.classList.contains('mx-auto'));
    assert.equal(document.querySelector<HTMLTextAreaElement>('#document-editor-container textarea')?.value, initialText);

    await click(toggle);
    assert.equal(toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(toggle.textContent, 'Xem toàn màn hình');
    assert(!content.firstElementChild?.classList.contains('max-w-2xl'));

    await click(button('In', headerActions));
    assert.equal(printCalls, 1, 'Clicking In must trigger browser native print/PDF export');
  } finally {
    Object.defineProperty(window, 'print', { configurable: true, writable: true, value: origPrint });
  }
});

test('library folder tree starts collapsed and expands on demand', async () => {
  await mount('/library/all');
  const main = document.querySelector('main')!;
  assert(button('Mở tất cả', main));
  assert.equal(main.querySelectorAll('table tbody button[title="Tùy chọn khác"]').length, 0);
  await click(button('Mở tất cả', main));
  assert(button('Thu gọn', main));
  assert(main.querySelector('table tbody button[title="Tùy chọn khác"]'));
  await click(button('Thu gọn', main));
  assert.equal(main.querySelectorAll('table tbody button[title="Tùy chọn khác"]').length, 0);
});

test('sidebar folders start collapsed and clicking a folder expands only that folder', async () => {
  await mount('/library/private');
  const sidebar = document.querySelector('aside')!;
  assert.equal(sidebar.querySelector('[data-unclassified-space]'), null);
  const toggles = Array.from(sidebar.querySelectorAll('button[aria-label^="Mở thư mục"]'));
  assert(toggles.length > 0);
  for (const toggle of toggles) assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  await click(sidebar.querySelector('[data-folder-id="fld_work"] span[role="button"]'));
  assert.equal(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]')?.getAttribute('aria-expanded'), 'true');
  assert.equal(sidebar.querySelector('[aria-label="Mở thư mục Cá nhân"]')?.getAttribute('aria-expanded'), 'false');
  await click(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]'));
  assert(sidebar.querySelector('[aria-label="Mở thư mục Công việc"]'));
  await click(sidebar.querySelector('[data-folder-id="fld_work"] span[role="button"]'));
  assert(sidebar.querySelector('[aria-label="Thu gọn thư mục Công việc"]'));
});

test('table selection inserts and removes rows and columns without losing neighboring cells', async () => {
  const { TableBlock } = await import('../components/editor/TableBlock');
  let block: import('../types').Block = { id: 'table-actions', type: 'table', content: '', properties: { tableData: { headers: ['A', 'B'], rows: [['a1', 'b1'], ['a2', 'b2']] } } };
  root = createRoot(document.getElementById('root')!);
  const render = () => root!.render(<TableBlock block={block} readOnly={false} onChange={(content, properties) => { block = { ...block, content, properties }; render(); }} />);
  await act(async () => render());
  const rowHandle = document.querySelector('[aria-label="Chọn hàng 2"]')!;
  rowHandle.getBoundingClientRect = () => new window.DOMRect(100, 200, 28, 34);
  await click(rowHandle);
  const rowMenu = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Thao tác hàng"]')!;
  assert(rowMenu);
  assert.equal(rowMenu.style.left, '134px');
  assert.equal(rowMenu.style.top, '200px');
  rowHandle.getBoundingClientRect = () => new window.DOMRect(100, 150, 28, 34);
  await act(async () => window.dispatchEvent(new window.Event('scroll')));
  assert.equal(rowMenu.style.top, '150px');
  await click(button('Thêm hàng phía trên'));
  assert.deepEqual(block.properties!.tableData!.rows, [['a1', 'b1'], ['', ''], ['a2', 'b2']]);
  await click(document.querySelector('[aria-label="Chọn hàng 2"]'));
  await click(button('Xóa hàng'));
  await click(document.querySelector('[aria-label="Chọn hàng 1"]'));
  await click(button('Thêm hàng bên dưới'));
  assert.deepEqual(block.properties!.tableData!.rows[1], ['', '']);
  const columnHandle = document.querySelector('[aria-label="Chọn cột 2"]')!;
  columnHandle.getBoundingClientRect = () => new window.DOMRect(300, 100, 150, 20);
  await click(columnHandle);
  const columnMenu = document.querySelector<HTMLElement>('[aria-label="Thao tác cột"]')!;
  assert.equal(columnMenu.style.left, '300px');
  assert.equal(columnMenu.style.top, '126px');
  await click(button('Thêm cột bên trái'));
  assert.deepEqual(block.properties!.tableData!.headers, ['A', '', 'B']);
  assert.deepEqual(block.properties!.tableData!.rows[2], ['a2', '', 'b2']);
  await click(document.querySelector('[aria-label="Chọn cột 2"]'));
  await click(button('Xóa cột'));
  await click(document.querySelector('[aria-label="Chọn cột 2"]'));
  await click(button('Thêm cột bên phải'));
  assert.deepEqual(block.properties!.tableData!.headers, ['A', 'B', '']);
  assert.deepEqual(block.properties!.tableData!.rows[0], ['a1', 'b1', '']);
  assert.equal(button('Thêm hàng'), undefined);
  assert.equal(button('Thêm cột'), undefined);
  await click(document.querySelector('[aria-label="Chọn cột 3"]'));
  await click(button('Thêm cột bên phải'));
  assert.equal(block.properties!.tableData!.headers.length, 4);
  const cells = document.querySelectorAll('tbody tr:first-child td');
  await act(async () => {
    cells[1].dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    cells[4].dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  assert(document.querySelector('[aria-label="Thao tác hàng"]'));
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test('video supports uploads and URLs while attachments only upload and retain their bytes within the page', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const { readAttachment } = await import('../utils/attachments');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'attachment-test', blocks: [
    { id: 'video-input', type: 'paragraph', content: '' }, { id: 'file-input', type: 'paragraph', content: '' },
  ] }]);
  const fill = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    await act(async () => {
      const prototype = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  const waitFor = async (predicate: () => boolean) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
      if (predicate()) return;
    }
    assert.fail('Attachment did not become ready');
  };
  const upload = async (input: Element, file: NodeFile) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new window.Event('change', { bubbles: true })); });
  };
  try {
    await mount('/documents/attachment-test');
    await fill(document.querySelector('[data-block-id="video-input"] textarea')!, '/video');
    await click(document.querySelector('button[data-slash-command-title="Video"]'));
    let dialog = document.querySelector('[aria-label="Chọn video"]')!;
    assert.equal(dialog.querySelectorAll('[role="tab"]').length, 2);
    await click(button('Liên kết', dialog));
    await fill(dialog.querySelector('input')!, 'javascript:alert(1)');
    await click(button('Nhúng video', dialog));
    assert(dialog.querySelector('[role="alert"]'));
    await fill(dialog.querySelector('input')!, 'https://example.com/demo.mp4');
    await click(button('Nhúng video', dialog));
    assert.equal(document.querySelector('video')?.getAttribute('src'), 'https://example.com/demo.mp4');
    await click(button('Thay video', document.querySelector('[data-attachment-block="video-input"]')!));
    dialog = document.querySelector('[aria-label="Chọn video"]')!;
    await click(button('Tải lên', dialog));
    await upload(dialog.querySelector('input[type="file"]')!, new NodeFile(['video bytes'], 'demo.mp4', { type: 'video/mp4' }));
    await waitFor(() => !!document.querySelector('video')?.getAttribute('src')?.startsWith('blob:'));
    await fill(document.querySelector('[aria-label="Chú thích video"]')!, 'Video từ máy tính');
    await fill(document.querySelector('[data-block-id="file-input"] textarea')!, '/tep');
    await click(document.querySelector('button[data-slash-command-title="Tệp"]'));
    dialog = document.querySelector('[aria-label="Chọn tệp"]')!;
    assert.equal(dialog.querySelector('[role="tab"]'), null);
    assert.equal(dialog.querySelector('input[type="url"]'), null);
    const bytes = new Uint8Array(3 * 1024 * 1024).fill(42);
    await upload(dialog.querySelector('input[type="file"]')!, new NodeFile([bytes], 'bao-cao.pdf', { type: 'application/pdf' }));
    await waitFor(() => !document.querySelector('[aria-label="Chọn tệp"]') && !!document.querySelector('[aria-label="Thao tác tệp"]'));
    assert(document.querySelector('[data-attachment-block="file-input"]')?.textContent?.includes('bao-cao.pdf'));
    await mount('/library/private');
    const saved = getStoredDocuments().find(doc => doc.id === 'attachment-test')!;
    const fileId = saved.blocks[1].properties?.attachmentId;
    assert(fileId);
    const stored = await readAttachment(fileId);
    assert.equal(stored?.size, bytes.length);
    assert.equal(stored?.type, 'application/pdf');
    assert.equal(new Uint8Array(await stored!.arrayBuffer())[0], 42);
    assert.equal(saved.blocks[0].properties?.url, undefined);
    await mount('/documents/attachment-test');
    await waitFor(() => !!document.querySelector('[aria-label="Thao tác tệp"]') && !!document.querySelector('video'));
    assert.equal(document.querySelector('video')?.getAttribute('src')?.startsWith('blob:'), true);
    assert.equal((document.querySelector('[aria-label="Chú thích video"]') as HTMLInputElement).value, 'Video từ máy tính');
    let downloaded = '';
    const originalClick = dom.window.HTMLAnchorElement.prototype.click;
    dom.window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };
    try { await click(button('Tải tệp xuống', document.querySelector('[aria-label="Thao tác tệp"]')!)); }
    finally { dom.window.HTMLAnchorElement.prototype.click = originalClick; }
    assert.equal(downloaded, 'bao-cao.pdf');
  } finally {
    if (root) { await act(async () => root!.unmount()); root = undefined; }

  }
});

test('slash image opens upload/link tabs and saves embedded URLs or local image files', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'image-test', blocks: [{ id: 'image-input', type: 'paragraph', content: '' }] }]);
  await mount('/documents/image-test');
  const fill = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    await act(async () => {
      const prototype = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  await fill(document.querySelector('[data-block-id="image-input"] textarea')!, '/hinh anh');
  await click(document.querySelector('button[data-slash-command-title="Hình ảnh"]'));
  const block = document.querySelector('[data-image-block="image-input"]')!;
  assert.equal(block.querySelector('img'), null);
  let dialog = block.querySelector('[aria-label="Chọn hình ảnh"]')!;
  assert(dialog);
  assert.equal(dialog.querySelectorAll('[role="tab"]').length, 2);
  assert(!dialog.textContent?.includes('Unsplash') && !dialog.textContent?.includes('GIPHY'));
  await click(button('Liên kết', dialog));
  const link = dialog.querySelector('input')!;
  await fill(link, 'javascript:alert(1)');
  await click(button('Nhúng hình ảnh', dialog));
  assert(dialog.querySelector('[role="alert"]'));
  assert.equal(block.querySelector('img'), null);
  await fill(link, 'https://example.com/image.png');
  await click(button('Nhúng hình ảnh', dialog));
  assert.equal(block.querySelector('img')?.getAttribute('src'), 'https://example.com/image.png');
  assert.equal(block.querySelector('[aria-label="Chọn hình ảnh"]'), null);
  const toolbar = block.querySelector('[role="toolbar"][aria-label="Thao tác hình ảnh"]')!;
  assert(button('Thay ảnh', toolbar));
  assert(button('Tải ảnh xuống', toolbar));
  assert.equal(button('Thay ảnh', block)?.closest('[role="toolbar"]'), toolbar);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Blocked by CORS'); };
  try {
    await click(button('Tải ảnh xuống', toolbar));
    assert(block.querySelector('[role="alert"]')?.textContent?.includes('Không tải được ảnh'));
    assert(block.querySelector('a[target="_blank"]'));
  } finally { globalThis.fetch = originalFetch; }
  await act(async () => { block.querySelector('img')!.dispatchEvent(new window.Event('error')); });
  await click(Array.from(block.querySelectorAll('button')).find(item => item.textContent?.includes('Không tải được ảnh')));
  dialog = block.querySelector('[aria-label="Chọn hình ảnh"]')!;
  await click(button('Tải lên', dialog));
  const input = dialog.querySelector('input[type="file"]')!;
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
  let loaded!: () => void;
  const ready = new Promise<void>(resolve => { loaded = resolve; });
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: class extends dom.window.FileReader {
    constructor() { super(); this.addEventListener('loadend', () => loaded()); }
  } });
  try {
    Object.defineProperty(input, 'files', { configurable: true, value: [new dom.window.File(['image bytes'], 'local.png', { type: 'image/png' })] });
    await act(async () => { input.dispatchEvent(new window.Event('change', { bubbles: true })); await ready; });
  } finally {
    if (previous) Object.defineProperty(globalThis, 'FileReader', previous); else Reflect.deleteProperty(globalThis, 'FileReader');
  }
  assert(block.querySelector('img')?.getAttribute('src')?.startsWith('data:image/png;base64,'));
  await fill(block.querySelector('[aria-label="Chú thích ảnh"]')!, 'Ảnh từ máy tính');
  assert(block.querySelector('[aria-label="Chú thích ảnh"]')?.classList.contains('text-center'));
  let filename = '';
  let downloadDone!: () => void;
  const downloaded = new Promise<void>(resolve => { downloadDone = resolve; });
  const originalClick = dom.window.HTMLAnchorElement.prototype.click;
  dom.window.HTMLAnchorElement.prototype.click = function () { filename = this.download; downloadDone(); };
  try {
    await act(async () => {
      button('Tải ảnh xuống', block)!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await downloaded;
    });
    assert.equal(filename, 'local.png');
  } finally { dom.window.HTMLAnchorElement.prototype.click = originalClick; }
  await mount('/library/private');
  const saved = getStoredDocuments().find(doc => doc.id === 'image-test')!.blocks[0];
  assert.equal(saved.properties?.fileName, 'local.png');
  assert(saved.properties?.url?.startsWith('data:image/png;base64,'));
  await mount('/documents/image-test');
  assert.equal(document.querySelector('[data-image-block="image-input"] img')?.getAttribute('alt'), 'Ảnh từ máy tính');
});

test('numbered lists render hierarchical numbering and update it when indentation changes', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'hierarchical-numbers', blocks: [{ id: 'number-tree', type: 'numbered', content: '', properties: {
    listItems: [1, 2, 3, 4, 4, 3, 2, 1, 2].map((level, index) => ({ id: `number-${index}`, content: `Item ${index}`, level })),
  } }] }]);
  await mount('/documents/hierarchical-numbers');
  const numbers = () => Array.from(document.querySelectorAll('[data-block-id="number-tree"] li > span')).map(span => span.textContent);
  assert.deepEqual(numbers(), ['1.', '1.1', '1.1.1', '1.1.1.1', '1.1.1.2', '1.1.2', '1.2', '2.', '2.1']);
  const input = document.querySelector('[data-list-item="number-8"] textarea') as HTMLTextAreaElement;
  await act(async () => {
    input.focus();
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  });
  assert.equal(numbers().at(-1), '3.');
  assert.equal(document.activeElement, input);
});

test('arrow keys move between paragraphs, headings and list items while preserving multiline navigation', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'arrow-lines', blocks: [
    { id: 'arrow-first', type: 'paragraph', content: 'First line' },
    { id: 'arrow-list', type: 'bullet', content: 'Item one\nItem two', properties: { listItems: [
      { id: 'arrow-item-one', content: 'Item one' }, { id: 'arrow-item-two', content: 'Item two' },
    ] } },
    { id: 'arrow-heading', type: 'h2', content: 'Heading' },
    { id: 'arrow-multiline', type: 'paragraph', content: 'First\nSecond' },
  ] }]);
  await mount('/documents/arrow-lines');
  const first = document.querySelector('[data-block-id="arrow-first"] textarea') as HTMLTextAreaElement;
  const list = document.querySelectorAll<HTMLTextAreaElement>('[data-block-id="arrow-list"] textarea');
  const headingInput = document.querySelector('[data-block-id="arrow-heading"] textarea') as HTMLTextAreaElement;
  const multiline = document.querySelector('[data-block-id="arrow-multiline"] textarea') as HTMLTextAreaElement;
  const arrow = async (input: HTMLTextAreaElement, key: string, offset: number) => {
    await act(async () => {
      input.focus(); input.setSelectionRange(offset, offset);
      input.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  };
  await arrow(first, 'ArrowDown', 3);
  assert.equal(document.activeElement, list[0]);
  assert.equal(list[0].selectionStart, 3);
  await arrow(list[0], 'ArrowUp', 3);
  assert.equal(document.activeElement, first);
  await arrow(list[0], 'ArrowDown', 2);
  assert.equal(document.activeElement, list[1]);
  assert.equal(list[1].selectionStart, 2);
  await arrow(list[1], 'ArrowDown', 2);
  const outside = document.querySelector('[data-block-id="arrow-list"]')!.nextElementSibling!.querySelector('textarea')!;
  assert.equal(document.activeElement, outside);
  await arrow(outside, 'ArrowUp', 0);
  assert.equal(document.activeElement, list[1]);
  await arrow(outside, 'ArrowDown', 0);
  assert.equal(document.activeElement, headingInput);
  await arrow(headingInput, 'ArrowDown', 1);
  assert.equal(document.activeElement, multiline);
  await arrow(multiline, 'ArrowDown', 1);
  assert.equal(document.activeElement, multiline);
  await arrow(multiline, 'ArrowUp', 8);
  assert.equal(document.activeElement, multiline);
  await arrow(multiline, 'ArrowUp', 1);
  assert.equal(document.activeElement, headingInput);
  assert.equal(headingInput.selectionStart, 1);
});

test('Tab and Shift+Tab change list indentation within four levels and Enter keeps the level', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  const types = ['bullet', 'numbered', 'checklist'] as const;
  saveStoredDocuments([{ ...base, id: 'list-levels', blocks: types.map(type => ({ id: `level-${type}`, type, content: 'Mục đầu' })) }]);
  await mount('/documents/list-levels');
  const key = async (input: HTMLTextAreaElement, value: string, shiftKey = false) => {
    await act(async () => {
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true }));
    });
  };
  for (const type of types) {
    const block = document.querySelector(`[data-block-id="level-${type}"]`)!;
    const first = block.querySelector('textarea')!;
    for (const expected of [2, 3, 4, 4]) {
      await key(first, 'Tab');
      assert.equal(block.querySelector('li')?.getAttribute('data-level'), String(expected));
      assert.equal(document.activeElement, first);
    }
    await key(first, 'Tab', true);
    assert.equal(block.querySelector('li')?.getAttribute('data-level'), '3');
    await key(first, 'Enter');
    const second = block.querySelectorAll('textarea')[1];
    assert.equal(block.querySelectorAll('li')[1].getAttribute('data-level'), '3');
    assert.equal(document.activeElement, second);
    for (const expected of [2, 1, 1]) {
      await key(second, 'Tab', true);
      assert.equal(block.querySelectorAll('li')[1].getAttribute('data-level'), String(expected));
    }
  }
  await mount('/library/private');
  const blocks = getStoredDocuments().find(doc => doc.id === 'list-levels')!.blocks;
  for (const block of blocks) assert.deepEqual(block.properties?.listItems?.map(item => item.level), [3, 1]);
  await mount('/documents/list-levels');
  assert.equal(document.querySelector<HTMLLIElement>('[data-block-id="level-bullet"] li')?.style.marginLeft, '48px');
});

test('folder explorer defaults to structure and supports cards, rows, sorting, navigation and moves', async () => {
  const { getStoredFolders, saveStoredFolders, saveStoredDocuments } = await import('../utils/storage');
  const template = getStoredFolders()[0];
  saveStoredFolders([
    { ...template, id: 'explorer-root', name: 'Root Explorer', parentId: null },
    { ...template, id: 'explorer-beta', name: 'Beta', parentId: 'explorer-root' },
    { ...template, id: 'explorer-alpha', name: 'Alpha', parentId: 'explorer-root' },
    { ...template, id: 'explorer-nested', name: 'Nested', parentId: 'explorer-alpha' },
  ]);
  const note = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([
    { ...note, id: 'explorer-note', title: 'Explorer root note', folderId: 'explorer-root', space: template.space },
    { ...note, id: 'explorer-child-note', title: 'Explorer nested note', folderId: 'explorer-nested', space: template.space },
    { ...note, id: 'explorer-trash', title: 'Hidden trash note', folderId: 'explorer-alpha', space: template.space, isTrash: true },
  ]);
  await mount('/folders/explorer-root');
  const main = document.querySelector('main')!;
  assert.equal(heading(), 'Root Explorer');
  const spaceLabel = template.space === 'personal' ? 'Ghi chép của tôi' : 'Tài liệu công ty';
  const breadcrumb = main.querySelector('nav[aria-label="Đường dẫn thư mục"]')!;
  assert.deepEqual(Array.from(breadcrumb.querySelectorAll('button')).map(item => item.textContent?.trim()), [spaceLabel, 'Root Explorer']);
  assert.equal(breadcrumb.textContent?.replace(/\s+/g, ' ').trim(), `${spaceLabel}Root Explorer`);
  assert.equal(button('Ghi chú mới', main), undefined);
  assert(main.querySelector('header button[aria-label="Tùy chọn thư mục Root Explorer"]'));
  assert(document.querySelector('aside [data-folder-id="explorer-root"] > [data-selected="true"]'));
  assert(main.querySelector('[data-folder-mode="structure"]'));
  assert.equal(main.querySelector('[data-folder-entry]')?.getAttribute('data-folder-entry'), 'explorer-beta');
  assert.equal(main.querySelector('button[title="Đổi tên thư mục"]'), null);
  assert.equal(main.querySelector('button[title="Di chuyển thư mục"]'), null);
  assert.equal(main.querySelector('button[title="Xóa thư mục"]'), null);
  assert.equal(button('Thư mục con', main), undefined);
  assert(main.textContent?.includes('Explorer nested note'));
  assert(!main.textContent?.includes('Hidden trash note'));
  await click(main.querySelector('[aria-label="Thu gọn Alpha"]'));
  assert(!main.textContent?.includes('Explorer nested note'));
  await click(main.querySelector('[aria-label="Dạng Lưới"]'));
  assert(main.querySelector('[data-folder-mode="grid"]'));
  assert.deepEqual(Array.from(main.querySelectorAll('[data-folder-entry]')).map(node => node.getAttribute('data-folder-entry')), ['explorer-beta', 'explorer-alpha']);
  assert(main.querySelector('[data-folder-entry="explorer-alpha"]')?.textContent?.includes('1 mục'));
  const sort = main.querySelector<HTMLSelectElement>('[aria-label="Sắp xếp thư mục"]')!;
  await act(async () => { sort.value = 'name-asc'; sort.dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.equal(main.querySelector('[data-folder-entry]')?.getAttribute('data-folder-entry'), 'explorer-alpha');
  await act(async () => { sort.value = 'name-desc'; sort.dispatchEvent(new window.Event('change', { bubbles: true })); });
  await click(main.querySelector('[aria-label="Dạng Danh sách"]'));
  assert(main.querySelector('[data-folder-mode="list"]'));
  assert.equal(main.querySelector('[data-folder-entry]')?.getAttribute('data-folder-entry'), 'explorer-beta');
  await click(main.querySelector('[aria-label="Tùy chọn thư mục Alpha"]'));
  await click(button('Đổi tên', document.querySelector('[role="menu"][aria-label="Thao tác thư mục Alpha"]')!));
  const rename = document.querySelector('[role="dialog"][aria-label="Đặt lại tên thư mục"]')!;
  assert(rename);
  await click(button('Huỷ', rename));
  await click(main.querySelector('[data-folder-entry="explorer-alpha"] button'));
  assert.equal(window.location.pathname, '/folders/explorer-alpha');
  assert.equal(heading(), 'Alpha');
  assert(document.querySelector('aside [data-folder-id="explorer-alpha"] > [data-selected="true"]'));
  assert(document.querySelector('aside [data-folder-id="explorer-root"] > [data-selected="false"]'));
  assert(document.querySelector('main [data-folder-mode="structure"]'));
  assert.deepEqual(Array.from(document.querySelectorAll('nav[aria-label="Đường dẫn thư mục"] button')).map(item => item.textContent?.trim()), [spaceLabel, 'Root Explorer', 'Alpha']);
  await click(button('Root Explorer', document.querySelector('nav[aria-label="Đường dẫn thư mục"]')!));
  assert.equal(heading(), 'Root Explorer');
  const { setActiveDrag } = await import('../utils/dnd');
  const beta = document.querySelector('[data-folder-entry="explorer-beta"]')!;
  await act(async () => {
    setActiveDrag({ type: 'folder', id: 'explorer-alpha' });
    beta.dispatchEvent(new window.Event('drop', { bubbles: true, cancelable: true }));
  });
  assert.equal(getStoredFolders().find(folder => folder.id === 'explorer-alpha')?.parentId, 'explorer-beta');
  const nested = document.querySelector('[data-folder-entry="explorer-nested"]')!;
  await act(async () => {
    setActiveDrag({ type: 'folder', id: 'explorer-beta' });
    nested.dispatchEvent(new window.Event('drop', { bubbles: true, cancelable: true }));
  });
  assert.equal(getStoredFolders().find(folder => folder.id === 'explorer-beta')?.parentId, 'explorer-root');
});

test('slash suggestions show the five most recently used unique items and survive reopening', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'recent-slash', blocks: [{ id: 'recent-input', type: 'paragraph', content: '' }] }]);
  await mount('/documents/recent-slash');
  const open = async () => {
    const input = document.querySelector('[data-block-id="recent-input"] textarea') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, input.value === '/' ? '/ ' : '/');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  const suggested = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Được đề xuất"] [role="option"]:not(:disabled)')).map(item => item.getAttribute('data-slash-command-title'));
  await open();
  const recommended = document.querySelector('[role="group"][aria-label="Được đề xuất"]')!;
  assert.equal(recommended.querySelector('button')?.getAttribute('data-slash-command-title'), 'Ghi chép cuộc họp với AI');
  assert(recommended.querySelector('button')?.disabled);
  const groups = Array.from(document.querySelectorAll('[role="group"]')).map(group => group.getAttribute('aria-label'));
  assert.equal(groups[groups.indexOf('Nội tuyến') - 1], 'Gợi ý template');
  assert(!groups.includes('Đang phát triển'));
  assert.deepEqual(suggested(), []);
  await click(document.querySelector('button[data-slash-command-title="Ghi chép cuộc họp với AI"]'));
  assert.deepEqual(suggested(), []);
  for (const title of ['Văn bản', 'Đề mục 1', 'Đề mục 2', 'Đề mục 3', 'Đề mục 4', 'Chữ màu đỏ']) {
    if (!document.querySelector('[aria-label="Chèn tiện ích nhanh"]')) await open();
    await click(document.querySelector(`button[data-slash-command-title="${title}"]`));
  }
  await open();
  assert.deepEqual(suggested(), ['Chữ màu đỏ', 'Đề mục 4', 'Đề mục 3', 'Đề mục 2', 'Đề mục 1']);
  const options = Array.from(document.querySelectorAll('[role="option"]'));
  assert.equal(new Set(options.map(option => option.id)).size, options.length);
  await click(document.querySelector('[aria-label="Được đề xuất"] button[data-slash-command-title="Đề mục 2"]'));
  await mount('/library/private');
  await mount('/documents/recent-slash');
  await open();
  assert.deepEqual(suggested(), ['Đề mục 2', 'Chữ màu đỏ', 'Đề mục 4', 'Đề mục 3', 'Đề mục 1']);
});

test('list Enter creates nested items and clicking below exits into a normal paragraph', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'nested-lists', blocks: [
    { id: 'bullet-list', type: 'paragraph', content: '' },
    { id: 'numbered-list', type: 'numbered', content: '' },
    { id: 'check-list', type: 'checklist', content: '' },
  ] }]);
  await mount('/documents/nested-lists');
  const fill = async (input: HTMLTextAreaElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      input.setSelectionRange(value.length, value.length);
    });
  };
  await fill(document.querySelector('[data-block-id="bullet-list"] textarea')!, '/');
  await click(document.querySelector('button[data-slash-command-title="Danh sách gạch đầu dòng"]'));
  let rootCount = 3;
  for (const id of ['bullet-list', 'numbered-list', 'check-list']) {
    const list = document.querySelector(`[data-block-id="${id}"]`)!;
    const first = list.querySelector('textarea')!;
    await fill(first, 'Mục 1');
    if (id === 'check-list') await click(list.querySelector('[role="checkbox"]'));
    await act(async () => {
      first.focus();
      first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    assert.equal(document.querySelectorAll('[data-block-id]').length, rootCount);
    const inputs = list.querySelectorAll('textarea');
    assert.equal(inputs.length, 2);
    assert.equal(document.activeElement, inputs[1]);
    await fill(inputs[1], 'Mục 2');
    if (id === 'bullet-list') {
      await act(async () => {
        inputs[1].setSelectionRange(2, 2);
        inputs[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      });
      assert.equal(list.querySelectorAll('textarea').length, 3);
      await act(async () => { document.activeElement!.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })); });
      assert.equal(list.querySelectorAll('textarea').length, 2);
      assert.equal(list.querySelectorAll('textarea')[1].value, 'Mục 2');
    }
    if (id === 'numbered-list') {
      assert.equal(list.querySelectorAll('li > span')[0].textContent, '1.');
      assert.equal(list.querySelectorAll('li > span')[1].textContent, '2.');
    }
    if (id === 'check-list') {
      assert.equal(list.querySelectorAll('[role="checkbox"]')[0].getAttribute('aria-checked'), 'true');
      assert.equal(list.querySelectorAll('[role="checkbox"]')[1].getAttribute('aria-checked'), 'false');
    }
    const exit = document.querySelector(`[data-list-exit-for="${id}"]`)!;
    assert(exit);
    assert.equal(exit.textContent, '');
    assert.equal(document.querySelector('[data-block-id]')?.textContent?.includes('Gõ nội dung bên dưới danh sách'), false);
    await click(exit.querySelector(id === 'numbered-list' ? '[aria-label="Tùy chọn khối sau danh sách"]'
      : id === 'check-list' ? '[aria-label="Thêm khối sau danh sách"]' : '[aria-label="Gõ văn bản bên dưới danh sách"]'));
    rootCount++;
    const outside = list.nextElementSibling!.querySelector('textarea')!;
    assert.equal(document.activeElement, outside);
    assert.equal(outside.placeholder, 'Nhấn / để chèn các khối');
    if (id === 'numbered-list') {
      assert(outside.closest('[data-block-id]')?.textContent?.includes('Nhân bản khối'));
      await act(async () => { outside.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true })); });
    }
    await fill(outside, 'Văn bản ngoài danh sách');
    // Once created, the real paragraph replaces the blank insertion row.
    assert.equal(document.querySelector(`[data-list-exit-for="${id}"]`), null);
    await act(async () => outside.focus());
    assert.equal(document.querySelectorAll('[data-block-id]').length, rootCount);
    assert.equal(document.activeElement, outside);
  }
  await mount('/library/private');
  const saved = getStoredDocuments().find(doc => doc.id === 'nested-lists')!;
  const lists = saved.blocks.filter(block => ['bullet', 'numbered', 'checklist'].includes(block.type));
  assert.equal(lists.length, 3);
  for (const list of lists) assert.deepEqual(list.properties?.listItems?.map(item => item.content), ['Mục 1', 'Mục 2']);
  assert.equal(saved.blocks.filter(block => block.type === 'paragraph').length, 3);
  await mount('/documents/nested-lists');
  assert.equal(document.querySelectorAll('[data-list-item]').length, 6);
});

test('slash filters while typing and arrow keys select without moving the editor cursor', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'slash-keyboard', blocks: [{ id: 'slash-input', type: 'paragraph', content: '' }] }]);
  await mount('/documents/slash-keyboard');
  const input = document.querySelector('[data-block-id="slash-input"] textarea') as HTMLTextAreaElement;
  const type = async (value: string) => {
    await act(async () => {
      input.focus();
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  const key = async (value: string) => {
    await act(async () => { input.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })); });
  };
  const selected = () => document.querySelector<HTMLButtonElement>('[aria-label="Tiện ích nhanh"] [aria-selected="true"]');
  await type('/h');
  assert.equal(selected()?.getAttribute('data-slash-command-title'), 'Hình ảnh');
  const first = selected()!.id;
  await key('ArrowDown');
  assert.notEqual(selected()?.id, first);
  assert.equal(document.activeElement, input);
  await key('ArrowUp');
  assert.equal(selected()?.id, first);
  await type('/de muc');
  assert.equal(document.querySelectorAll('[aria-label="Tiện ích nhanh"] [role="option"]').length, 4);
  assert.equal(selected()?.getAttribute('data-slash-command-title'), 'Đề mục 1');
  await key('ArrowDown');
  assert.equal(selected()?.getAttribute('data-slash-command-title'), 'Đề mục 2');
  await key('Enter');
  assert.equal(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'), null);
  assert.equal(document.querySelectorAll('[data-block-id]').length, 1);
  await type('/khongtimthayxyz');
  assert(document.querySelector('[aria-label="Tiện ích nhanh"]')?.textContent?.includes('Không tìm thấy'));
  await key('ArrowDown');
  await key('Enter');
  assert.equal(document.querySelectorAll('[data-block-id]').length, 1);
  await key('Escape');
  assert.equal(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'), null);
  await mount('/library/private');
  assert.equal(getStoredDocuments().find(doc => doc.id === 'slash-keyboard')?.blocks[0].type, 'h2');
});

test('Enter after every heading level creates and focuses a paragraph below it', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  const levels = ['h1', 'h2', 'h3', 'h4'] as const;
  saveStoredDocuments([{ ...base, id: 'heading-enter', blocks: levels.map(type => ({ id: type, type, content: `Đề mục ${type}` })) }]);
  await mount('/documents/heading-enter');
  for (const level of levels) {
    const input = document.querySelector(`[data-block-id="${level}"] textarea`) as HTMLTextAreaElement;
    await act(async () => {
      input.focus();
      input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    const next = input.closest('[data-block-id]')!.nextElementSibling!;
    const paragraph = next.querySelector('textarea')!;
    assert.equal(document.activeElement, paragraph);
    assert.equal(paragraph.value, '');
    assert.equal(input.value, `Đề mục ${level}`);
  }
  await mount('/library/private');
  const blocks = getStoredDocuments().find(doc => doc.id === 'heading-enter')!.blocks;
  assert.deepEqual(blocks.map(block => block.type), ['h1', 'paragraph', 'h2', 'paragraph', 'h3', 'paragraph', 'h4', 'paragraph']);
});

test('Enter moves the cursor to the new block and allows immediate continued typing', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'enter-focus', blocks: [{ id: 'first-line', type: 'paragraph', content: 'Dòng đầu tiên' }] }]);
  await mount('/documents/enter-focus');
  const first = document.querySelector('[data-block-id="first-line"] textarea') as HTMLTextAreaElement;
  const enter = async (input: HTMLTextAreaElement, options: KeyboardEventInit = {}) => {
    await act(async () => {
      input.focus();
      input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options }));
    });
  };
  await enter(first);
  let inputs = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-block-id] textarea'));
  assert.equal(inputs.length, 2);
  assert.equal(document.activeElement, inputs[1]);
  assert.equal(inputs[1].selectionStart, 0);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(inputs[1], 'Gõ tiếp ngay');
    inputs[1].dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(document.activeElement, inputs[1]);
  await enter(inputs[1]);
  inputs = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-block-id] textarea'));
  assert.equal(inputs.length, 3);
  assert.equal(document.activeElement, inputs[2]);
  await enter(inputs[2], { shiftKey: true });
  await enter(inputs[2], { isComposing: true });
  assert.equal(document.querySelectorAll('[data-block-id] textarea').length, 3);
  await mount('/library/private');
  assert.equal(getStoredDocuments().find(doc => doc.id === 'enter-focus')?.blocks[1].content, 'Gõ tiếp ngay');
});

test('slash colors apply independently, preserve block type and reset to defaults', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'colors-test', blocks: [
    { id: 'color-block', type: 'h2', content: '', properties: { headingLevel: 2 } },
  ] }]);
  await mount('/documents/colors-test');
  const type = async (value: string) => {
    const input = document.querySelector('[data-block-id="color-block"] textarea') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  await type('/');
  const groups = Array.from(document.querySelectorAll('[aria-label="Tiện ích nhanh"] [role="group"]'));
  assert.deepEqual(groups.slice(-2).map(group => group.getAttribute('aria-label')), ['Màu chữ', 'Màu nền']);
  const yellowSwatch = document.querySelector<HTMLSpanElement>('button[data-slash-command-title="Nền vàng"] span[aria-hidden="true"]')!;
  assert.equal(yellowSwatch.style.backgroundColor, 'rgb(252, 225, 129)');
  assert.equal(yellowSwatch.style.borderColor, 'rgb(203, 145, 47)');
  const defaultSwatch = document.querySelector<HTMLSpanElement>('button[data-slash-command-title="Nền mặc định"] span[aria-hidden="true"]')!;
  assert.equal(defaultSwatch.style.backgroundColor, 'transparent');
  await click(document.querySelector('button[data-slash-command-title="Chữ màu đỏ"]'));
  await type('/nen xanh lam');
  await click(document.querySelector('button[data-slash-command-title="Nền xanh lam"]'));
  await type('Nội dung được giữ');
  const content = document.querySelector('[data-block-id="color-block"] textarea')!.parentElement!;
  assert.equal(content.style.color, 'rgb(212, 76, 71)');
  assert.equal(content.style.backgroundColor, 'rgb(231, 243, 248)');
  await mount('/library/private');
  let block = getStoredDocuments().find(doc => doc.id === 'colors-test')!.blocks[0];
  assert.equal(block.type, 'h2');
  assert.equal(block.content, 'Nội dung được giữ');
  assert.equal(block.properties?.headingLevel, 2);
  assert.equal(block.properties?.textColor, '#D44C47');
  assert.equal(block.properties?.backgroundColor, '#E7F3F8');
  await mount('/documents/colors-test');
  await type('/chu mac dinh');
  await click(document.querySelector('button[data-slash-command-title="Chữ mặc định"]'));
  await mount('/library/private');
  block = getStoredDocuments().find(doc => doc.id === 'colors-test')!.blocks[0];
  assert.equal(block.type, 'h2');
  assert.equal(block.properties?.textColor, undefined);
  assert.equal(block.properties?.backgroundColor, '#E7F3F8');
});

test('AI meeting command is visible but cannot be selected with mouse or keyboard', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'disabled-slash', blocks: [{ id: 'disabled-block', type: 'paragraph', content: '' }] }]);
  await mount('/documents/disabled-slash');
  const textarea = document.querySelector('[data-block-id="disabled-block"] textarea') as HTMLTextAreaElement;
  const type = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, value);
      textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  await type('/AI');
  const ai = document.querySelector('button[data-slash-command-title="Ghi chép cuộc họp với AI"]') as HTMLButtonElement;
  assert(ai.disabled);
  assert(ai.textContent?.includes('Đang phát triển'));
  await click(ai);
  await act(async () => { textarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
  assert(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'));
  await type('/');
  assert.equal(document.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('data-slash-command-title'), 'Văn bản');
  await act(async () => { textarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })); });
  assert.equal(document.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('data-slash-command-title'), 'Nền đỏ');
  await mount('/library/private');
  assert.equal(getStoredDocuments().find(doc => doc.id === 'disabled-slash')?.blocks[0].type, 'paragraph');
});

test('invitation mock adds employees, saves individual permissions and reuses simple mentions', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'mentions-test', blocks: [
    { id: 'mention-person', type: 'paragraph', content: '' },
    { id: 'mention-group', type: 'paragraph', content: '' },
    { id: 'mention-reuse', type: 'paragraph', content: '' },
  ] }]);
  await mount('/documents/mentions-test');
  const fill = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    await act(async () => {
      const prototype = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  await fill(document.querySelector('[data-block-id="mention-person"] textarea')!, '@');
  await click(document.querySelector('button[data-slash-command-title="Nhắc đến 1 người"]'));
  let dialog = document.querySelector('[aria-label="Mời và phân quyền"]')!;
  assert(dialog);
  assert(!dialog.textContent?.includes('Các mức quyền'));
  assert.equal(document.querySelector('[aria-label="Danh sách nhân viên"]'), null);
  const mentionDirectory = dialog.querySelector('[aria-label="Danh bạ"]')!;
  mentionDirectory.getBoundingClientRect = () => new window.DOMRect(600, 180, 100, 44);
  await click(mentionDirectory);
  const mentionPopup = document.querySelector<HTMLElement>('[data-employee-picker-popover="directory"]')!;
  assert.equal(mentionPopup.style.left, '600px');
  assert.equal(mentionPopup.style.top, '232px');
  assert(document.querySelector('[aria-label="Danh sách nhân viên"] [role="option"]'));
  await click(document.querySelector('[aria-label="Đóng danh sách nhân viên"]'));
  await click(button('Gửi lời mời (0)', dialog));
  assert(dialog.querySelector('[role="alert"]'));
  const add = async (query: string) => {
    await fill(dialog.querySelector<HTMLInputElement>('input[aria-label="Tìm nhân viên"]')!, query);
    await click(document.querySelector('[aria-label="Danh sách nhân viên"] [role="option"]'));
    await click(button('Thêm', dialog));
  };
  await add('thu ha');
  await add('cuong.viet');
  assert.equal(dialog.querySelectorAll('[data-invite-email]').length, 2);
  await click(dialog.querySelector('[aria-label="Xóa Việt Cường khỏi danh sách mời"]'));
  assert.equal(dialog.querySelectorAll('[data-invite-email]').length, 1);
  await add('cuong.viet');
  const role = async (name: string, value: string) => {
    const select = dialog.querySelector<HTMLSelectElement>(`select[aria-label="Quyền của ${name}"]`)!;
    await act(async () => { select.value = value; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
  };
  await role('Trần Thị Thu Hà', 'comment');
  await role('Việt Cường', 'view');
  await fill(dialog.querySelector('textarea')!, 'Bạn kiểm tra giúp mình nhé');
  await click(button('Gửi lời mời (2)', dialog));
  const person = document.querySelector('[data-block-id="mention-person"]')!;
  assert(person.textContent?.includes('@Trần Thị Thu Hà'));
  assert(!person.textContent?.includes('Có thể bình luận'));
  assert(!person.textContent?.includes('Bạn kiểm tra giúp mình nhé'));
  await fill(document.querySelector('[data-block-id="mention-group"] textarea')!, '/nhom');
  await click(document.querySelector('button[data-slash-command-title="Nhắc đến 1 nhóm"]'));
  dialog = document.querySelector('[aria-label="Mời và phân quyền nhóm"]')!;
  await fill(dialog.querySelector('[aria-label="Tên nhóm"]')!, 'Nhóm sản phẩm');
  await add('nam.le');
  await click(button('Gửi lời mời (1)', dialog));
  await mount('/library/private');
  const saved = getStoredDocuments().find(doc => doc.id === 'mentions-test')!;
  assert.deepEqual(saved.blocks[0].properties?.mention?.permissions, {
    'ha.tran@congty.vn': 'comment', 'cuong.viet@congty.vn': 'view',
  });
  assert.equal(saved.blocks[0].properties?.mention?.scope, 'page');
  assert.equal(saved.blocks[1].properties?.mention?.groupName, 'Nhóm sản phẩm');
  await mount('/documents/mentions-test');
  await click(Array.from(document.querySelectorAll('[data-block-id="mention-person"] button')).find(item => item.textContent?.includes('@Việt Cường')));
  dialog = document.querySelector('[aria-label="Mời và phân quyền"]')!;
  assert.equal(dialog.querySelector<HTMLSelectElement>('[aria-label="Quyền của Việt Cường"]')?.value, 'view');
  await role('Việt Cường', 'full');
  await click(button('Hủy', dialog));
  await fill(document.querySelector('[data-block-id="mention-reuse"] textarea')!, '@cuong.viet');
  await click(document.querySelector('button[data-slash-command-title="Việt Cường"]'));
  await mount('/library/private');
  const reused = getStoredDocuments().find(doc => doc.id === 'mentions-test')!.blocks[2];
  assert.equal(reused.content, '@Việt Cường');
  assert.equal(reused.properties?.mention?.permission, 'view');
});

test('space panels highlight document drops to root and display moved notes outside folders', async () => {
  const { setActiveDrag, clearActiveDrag } = await import('../utils/dnd');
  const drag = (type: string, target: Element, relatedTarget?: Element) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { dataTransfer: { getData: () => '', dropEffect: 'none' }, relatedTarget });
    target.dispatchEvent(event);
  };
  try {
    for (const space of ['personal', 'company'] as const) {
      await mount(space === 'personal' ? '/library/private' : '/library/company');
      const doc = getStoredDocuments().find(item => !item.isTrash && item.folderId)!;
      const panel = document.querySelector(`[data-space-panel="${space}"]`)!;
      assert.equal(panel.querySelector('[data-unclassified-space]'), null);
      await act(async () => {
        setActiveDrag({ type: 'document', id: doc.id });
        drag('dragover', panel.firstElementChild!);
      });
      assert(panel.firstElementChild!.className.includes('ring-1'));
      await act(async () => drag('dragleave', panel.firstElementChild!, panel.querySelector('button')!));
      assert(panel.firstElementChild!.className.includes('ring-1'), 'Moving between children must keep the highlight');
      await act(async () => drag('dragleave', panel.firstElementChild!));
      assert(!panel.firstElementChild!.className.includes('ring-1'));
      await act(async () => drag('dragover', panel));
      await act(async () => drag('drop', panel));
      const moved = getStoredDocuments().find(item => item.id === doc.id)!;
      assert.equal(moved.folderId, null);
      assert.equal(moved.space, space);
      assert(panel.querySelector(`[data-sidebar-document="${doc.id}"]`));
    }
  } finally { await act(async () => clearActiveDrag()); }
});

test('note rename uses the folder-style dialog and only saves on confirmation', async () => {
  await mount('/library/private');
  const doc = getStoredDocuments().find(item => !item.isTrash && item.space === 'personal')!;
  const openRename = async () => {
    const trigger = Array.from(document.querySelectorAll('aside button')).find(item => item.getAttribute('aria-label') === `Tùy chọn ${doc.title}` && item.closest('[data-sidebar-document]')?.getAttribute('data-sidebar-document') === doc.id);
    await click(trigger);
    await click(Array.from(document.querySelectorAll('aside button')).find(item => Array.from(item.querySelectorAll('span')).some(span => span.textContent === 'Đổi tên')));
    return document.querySelector('[role="dialog"][aria-label="Đặt lại tên ghi chú"]')!;
  };
  let dialog = await openRename();
  assert(dialog);
  let input = dialog.querySelector('input')!;
  assert.equal(input.value, doc.title);
  assert.equal(document.activeElement, input);
  const fill = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  await fill('Tên chưa lưu');
  await click(button('Huỷ', dialog));
  assert.equal(getStoredDocuments().find(item => item.id === doc.id)?.title, doc.title);
  dialog = await openRename(); input = dialog.querySelector('input')!;
  await fill('   ');
  assert.equal(button('Lưu', dialog)?.disabled, true);
  await fill('  Ghi chú đã đổi tên  ');
  await click(button('Lưu', dialog));
  assert.equal(getStoredDocuments().find(item => item.id === doc.id)?.title, 'Ghi chú đã đổi tên');
  assert.equal(document.querySelector('[aria-label="Đặt lại tên ghi chú"]'), null);
  await mount('/library/all');
  const main = document.querySelector('main')!;
  await click(button('Mở tất cả', main));
  await click(main.querySelector('table button[title="Tùy chọn khác"]'));
  await click(Array.from(main.querySelectorAll('[aria-label="Thao tác tài liệu"] button')).find(item => Array.from(item.querySelectorAll('span')).some(span => span.textContent === 'Đổi tên')));
  dialog = document.querySelector('[aria-label="Đặt lại tên ghi chú"]')!;
  assert(dialog);
  await act(async () => { dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.equal(document.querySelector('[aria-label="Đặt lại tên ghi chú"]'), null);
  await mount(`/documents/${doc.id}`);
  const editor = document.querySelector('main')!;
  await click(editor.querySelector('button[title="Tùy chọn khác"]'));
  await click(Array.from(editor.querySelectorAll('[aria-label="Thao tác tài liệu"] button')).find(item => Array.from(item.querySelectorAll('span')).some(span => span.textContent === 'Đổi tên')));
  dialog = document.querySelector('[aria-label="Đặt lại tên ghi chú"]')!;
  assert(dialog);
  input = dialog.querySelector('input')!;
  await fill('Đổi tên từ trình soạn thảo');
  await act(async () => { input.closest('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
  await mount('/library/private'); // Unmount flushes the editor's pending save.
  assert.equal(getStoredDocuments().find(item => item.id === doc.id)?.title, 'Đổi tên từ trình soạn thảo');
});

test('share menu copies the current document URL and reports clipboard failures honestly', async () => {
  await mount('/library/private');
  const doc = getStoredDocuments().find(item => !item.isTrash && item.space === 'personal')!;
  let copied = '';
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async (value: string) => { copied = value; },
  } });
  const aside = document.querySelector('aside')!;
  const trigger = Array.from(aside.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === `Tùy chọn ${doc.title}` && item.closest('[data-sidebar-document]')?.getAttribute('data-sidebar-document') === doc.id)!;
  await click(trigger);
  await click(button('Chia sẻ', aside));
  let dialog = document.querySelector('[role="dialog"][aria-label="Chia sẻ tài liệu"]')!;
  assert(dialog);
  const expected = `http://localhost:3000/documents/${encodeURIComponent(doc.id)}`;
  assert(dialog.textContent?.includes('Thêm người'));
  assert(dialog.textContent?.includes('Quyền truy cập chung'));
  await click(button('Sao chép đường liên kết', dialog));
  assert.equal(copied, expected);
  assert(button('Đã sao chép', dialog));
  await click(dialog.querySelector('button[aria-label="Đóng chia sẻ"]'));
  await mount('/library/all');
  const main = document.querySelector('main')!;
  await click(button('Mở tất cả', main));
  await click(main.querySelector('table button[title="Tùy chọn khác"]'));
  await click(button('Chia sẻ', main));
  dialog = document.querySelector('[aria-label="Chia sẻ tài liệu"]')!;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async () => { throw new Error('Permission denied'); },
  } });
  await click(button('Sao chép đường liên kết', dialog));
  assert(dialog.textContent?.includes('Nhấn Ctrl+C'));
  assert(!button('Đã sao chép', dialog));
  const input = dialog.querySelector<HTMLInputElement>('[aria-label="Liên kết tài liệu"]')!;
  assert.equal(input.selectionEnd, input.value.length);
  await act(async () => { dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.equal(document.querySelector('[aria-label="Chia sẻ tài liệu"]'), null);
  await mount(new URL(copied).pathname);
  assert.equal(document.querySelector<HTMLTextAreaElement>('main textarea[placeholder="Tiêu đề trang..."]')?.value, doc.title);
  Reflect.deleteProperty(navigator, 'clipboard');
});

test('trash uses library layout and keeps restore, delete confirmation and empty-trash actions', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments()[0];
  saveStoredDocuments([
    { ...base, id: 'trash-personal', title: 'TRASH PERSONAL', space: 'personal', folderId: 'fld_work', isTrash: true, deletedAt: '2026-11-10T01:00:00Z' },
    { ...base, id: 'trash-company', title: 'TRASH COMPANY', space: 'company', folderId: null, isTrash: true, deletedAt: '2026-11-10T02:00:00Z' },
    { ...base, id: 'live-note', title: 'LIVE NOTE', isTrash: false },
  ]);
  await mount('/trash');
  let main = document.querySelector('main')!;
  assert.equal(heading(), 'Thùng rác');
  assert(main.querySelector('input[placeholder="Tìm trong thùng rác..."]'));
  assert(main.querySelector('table'));
  await click(button('Mở tất cả', main));
  assert(main.textContent?.includes('TRASH PERSONAL') && main.textContent?.includes('TRASH COMPANY'));
  assert(!main.textContent?.includes('LIVE NOTE'));
  assert(!button('Ghi chú mới', main));
  await click(button('Công ty', main));
  assert.equal(window.location.pathname, '/trash');
  assert(!main.textContent?.includes('TRASH PERSONAL'));
  await click(button('Tất cả', main));
  await click(main.querySelector('button[aria-label="Dạng lưới"]'));
  await click(main.querySelector('button[aria-label="Xóa vĩnh viễn TRASH COMPANY"]'));
  assert(getStoredDocuments().some(doc => doc.id === 'trash-company'));
  await click(button('Hủy bỏ', main));
  assert(getStoredDocuments().some(doc => doc.id === 'trash-company'));
  await click(main.querySelector('button[aria-label="Xóa vĩnh viễn TRASH COMPANY"]'));
  await click(button('Xác nhận xóa', main));
  assert(!getStoredDocuments().some(doc => doc.id === 'trash-company'));
  await click(main.querySelector('button[aria-label="Dạng danh sách"]'));
  await click(main.querySelector('button[aria-label="Khôi phục TRASH PERSONAL"]'));
  assert.equal(getStoredDocuments().find(doc => doc.id === 'trash-personal')?.isTrash, false);
  assert(main.textContent?.includes('Thùng rác đang trống'));
  assert(!main.textContent?.includes('TRASH PERSONAL'));

  saveStoredDocuments([{ ...base, id: 'trash-again', title: 'TRASH AGAIN', isTrash: true }]);
  await mount('/trash');
  main = document.querySelector('main')!;
  await click(button('Dọn sạch thùng rác', main));
  assert(getStoredDocuments().some(doc => doc.id === 'trash-again'));
  await click(button('Xác nhận dọn sạch', main));
  assert.equal(getStoredDocuments().length, 0);
});

async function goHistory(direction: 'back' | 'forward') {
  await act(async () => {
    const changed = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
    window.history[direction]();
    await changed;
  });
}

test('real sidebar and library clicks update both URL and the rendered page', async () => {
  await mount('/library/private');
  assert.equal(heading(), 'Thư viện');
  await click(button('Mẫu ghi chú', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/templates'); assert.equal(heading(), 'Mẫu ghi chú');
  await click(document.getElementById('space-tab-company'));
  assert.equal(window.location.pathname, '/company'); assert.equal(heading(), 'Tài liệu công ty');
  assert.equal(document.getElementById('space-tab-company')?.getAttribute('aria-selected'), 'true');
  await click(button('GHI CHÉP CỦA TÔI'));
  assert.equal(window.location.pathname, '/private'); assert.equal(heading(), 'Ghi chép của tôi');
  await click(button('Thư viện', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/library/all');
  await click(button('Của tôi', document.querySelector('main')!));
  assert.equal(window.location.pathname, '/library/private');
});

test('Back and Forward render the page stored in browser history', async () => {
  await mount('/library/private');
  await click(button('Mẫu ghi chú'));
  await click(document.getElementById('space-tab-company'));
  await goHistory('back'); assert.equal(window.location.pathname, '/templates'); assert.equal(heading(), 'Mẫu ghi chú');
  await goHistory('back'); assert.equal(window.location.pathname, '/library/private'); assert.equal(heading(), 'Thư viện');
  await goHistory('forward'); assert.equal(window.location.pathname, '/templates'); assert.equal(heading(), 'Mẫu ghi chú');
});

test('library document types use workspace labels and filter by workspace', async () => {
  await mount('/library/all');
  const main = document.querySelector('main')!;
  await click(main.querySelector('button[aria-label="Dạng danh sách"]'));
  await click(button('Loại tài liệu', main));
  assert(button('Ghi chú của tôi', main)?.querySelector('.lucide-lock-keyhole'));
  assert(button('Tài liệu công ty', main)?.querySelector('.lucide-building-2'));
  await click(button('Ghi chú của tôi', main));
  const rows = () => Array.from(main.querySelectorAll('tbody tr'));
  assert(rows().length > 0);
  assert(rows().every(row => row.querySelectorAll('td')[2]?.textContent === 'Ghi chú của tôi'));
  await click(button('Ghi chú của tôi', main));
  await click(button('Tài liệu công ty', main));
  assert(rows().length > 0);
  assert(rows().every(row => row.querySelectorAll('td')[2]?.textContent === 'Tài liệu công ty'));
  assert(rows().every(row => row.querySelectorAll('td')[2]?.querySelectorAll('svg').length === 1), 'Each document type has one icon');
});

test('shared and recents library tabs disable tree mode and allow list and grid', async () => {
  for (const path of ['/library/shared', '/library/recents']) {
    await mount(path);
    const main = document.querySelector('main')!;
    const tree = main.querySelector<HTMLButtonElement>('button[aria-label="Dạng cây thư mục"]')!;
    assert(tree.disabled);
    assert(main.querySelector('table'));
    await click(main.querySelector('button[title="Dạng lưới"]'));
    assert(!main.querySelector('table'));
    await click(main.querySelector('button[title="Dạng danh sách"]'));
    assert(main.querySelector('table'));
  }
});

test('all library navigation tabs, sidebar lists and folder names have working routes', async () => {
  for (const [label, path] of [['Của tôi', '/library/private'], ['Công ty', '/library/company'], ['Được chia sẻ', '/library/shared'], ['Gần đây', '/library/recents'], ['Mẫu', '/templates']]) {
    await mount('/library/all');
    await click(button(label, document.querySelector('main')!));
    assert.equal(window.location.pathname, path);
    if (path !== '/templates') {
      assert.equal(heading(), 'Thư viện');
      assert(document.querySelector('main')?.textContent?.includes('Tất cả ghi chú và tài liệu bạn có quyền truy cập.'));
    }
  }
  await mount('/library/private');
  await click(button('Công việc', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/folders/fld_work'); assert.equal(heading(), 'Công việc');
  await click(document.getElementById('space-tab-company'));
  await click(button('TÀI LIỆU CÔNG TY'));
  assert.equal(window.location.pathname, '/company');
  assert(!document.querySelector('aside')!.textContent?.includes('Gần đây'));
  await click(Array.from(document.querySelectorAll('aside span')).find(element => element.textContent === 'Yêu thích'));
  assert.equal(window.location.pathname, '/favorites'); assert.equal(heading(), 'Yêu thích');
  await click(document.querySelector('aside button[aria-label="Thùng rác"]'));
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
    assert.equal((document.querySelector('textarea[placeholder="Tiêu đề trang..."]') as HTMLTextAreaElement).value, saved.title);
  }
  assert.equal(documentIds.size, 5);
  assert.equal(getStoredDocuments().length, initialCount + 5);
  const documentPath = window.location.pathname;
  await mount(documentPath); // Fresh application mount at a copied document URL.
  assert.equal(window.location.pathname, documentPath);
  assert(document.querySelector('textarea[placeholder="Tiêu đề trang..."]'));
});

test('direct links and reloads open templates, private/company lists, folders and not-found pages', async () => {
  for (const [path, title] of [['/templates', 'Mẫu ghi chú'], ['/library/private', 'Thư viện'], ['/library/company', 'Thư viện'], ['/folders/fld_work', 'Công việc']]) {
    await mount(path); assert.equal(window.location.pathname, path); assert.equal(heading(), title);
    await mount(path); assert.equal(window.location.pathname, path); assert.equal(heading(), title);
  }
  await mount('/documents/missing'); assert.equal(heading(), 'Tài liệu không khả dụng');
  await mount('/folders/missing'); assert.equal(heading(), 'Không tìm thấy thư mục');
  await mount('/no-such-page'); assert.equal(heading(), 'Không tìm thấy trang');
  await mount('/'); assert.equal(window.location.pathname, '/private'); assert.equal(heading(), 'Ghi chép của tôi');
});

test('new notes use the space and folder of the current page', async () => {
  for (const [path, space, folderId] of [['/library/private', 'personal', null], ['/library/company', 'company', null], ['/folders/fld_work', 'personal', 'fld_work']] as const) {
    await mount(path);
    if (folderId) {
      await click(document.querySelector('main header button[aria-label="Tạo thư mục con trong Công việc"]'));
      await click(button('Tạo tài liệu', document.querySelector('main')!));
    } else await click(button('Ghi chú mới', document.querySelector('main')!));
    const id = decodeURIComponent(window.location.pathname.split('/').pop()!);
    const saved = getStoredDocuments().find(doc => doc.id === id)!;
    assert.equal(saved.space, space); assert.equal(saved.folderId, folderId);
  }
});

test('pending editor changes survive immediate navigation and a fresh document mount', async () => {
  await mount('/documents/doc_week_plan');
  const input = document.querySelector('textarea[placeholder="Tiêu đề trang..."]') as HTMLTextAreaElement;
  assert(input);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Edited before navigating');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await click(button('Mẫu ghi chú'));
  assert.equal(getStoredDocuments().find(doc => doc.id === 'doc_week_plan')?.title, 'Edited before navigating');
  await mount('/documents/doc_week_plan');
  assert.equal((document.querySelector('textarea[placeholder="Tiêu đề trang..."]') as HTMLTextAreaElement).value, 'Edited before navigating');
});

test('avatar appearance picker switches all three themes and persists the selection', async () => {
  await mount('/library/private');
  assert.equal(document.documentElement.dataset.theme, 'default');
  await click(document.querySelector('button[aria-label="Tài khoản cá nhân"]'));
  await click(button('Giao diện', document.getElementById('account-dropdown')!));
  assert.equal(document.querySelectorAll('#appearance-options [role="radio"]').length, 3);
  for (const id of ['blue-yellow', 'graphite-champagne', 'default']) {
    await click(document.getElementById(`theme-option-${id}`));
    assert.equal(document.documentElement.dataset.theme, id);
    assert.equal(memoryStorage.getItem('misa_ui_theme'), id);
    assert.equal(document.getElementById(`theme-option-${id}`)?.getAttribute('aria-checked'), 'true');
    assert.equal(document.querySelectorAll('#appearance-options [aria-checked="true"]').length, 1);
  }
  await click(document.getElementById('theme-option-graphite-champagne'));
  await click(button('Mẫu ghi chú', document.querySelector('aside')!));
  assert.equal(window.location.pathname, '/templates');
  assert.equal(document.documentElement.dataset.theme, 'graphite-champagne');
  await mount('/library/company');
  assert.equal(document.documentElement.dataset.theme, 'graphite-champagne');
  assert.equal(heading(), 'Thư viện');
});

test('appearance options support arrow keys, Escape and an invalid saved value', async () => {
  memoryStorage.setItem('misa_ui_theme', 'invalid-theme');
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
    await mount('/library/private');
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
  await mount('/library/private');
  const initialNoteCount = getStoredDocuments().length;
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  await click(button('Tạo thư mục', document.querySelector('[role="menu"]')!));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert(getStoredFolders().some(folder => folder.name === 'Thư mục mới' && folder.parentId === 'fld_work'));
  await nameNewFolder('Sprint A');
  const child = getStoredFolders().find(folder => folder.name === 'Sprint A')!;
  assert.equal(child.parentId, 'fld_work'); assert.equal(child.space, 'personal');
  assert.equal(getStoredDocuments().length, initialNoteCount);
  assert(document.querySelector(`[data-folder-id="fld_work"] [data-folder-id="${child.id}"]`));
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Sprint A"]'));
  await click(button('Tạo thư mục', document.querySelector('[role="menu"]')!));
  await nameNewFolder('Tasks');
  const grandchild = getStoredFolders().find(folder => folder.name === 'Tasks')!;
  assert.equal(grandchild.parentId, child.id);
  assert(document.querySelector(`[data-folder-id="${child.id}"] [data-folder-id="${grandchild.id}"]`));
  await click(document.querySelector('aside button[aria-label="Tùy chọn thư mục Tasks"]'));
  await click(document.querySelector('button[aria-label="Đổi tên thư mục Tasks"]'));
  await fillFolderName('Tasks renamed');
  assert.equal(getStoredFolders().find(folder => folder.id === grandchild.id)?.parentId, child.id);
  await click(button('Sprint A', document.querySelector('aside')!));
  assert(button('Tasks renamed', document.querySelector('main')!));
  await click(document.querySelector('main header button[aria-label="Tạo thư mục con trong Sprint A"]'));
  await click(button('Tạo tài liệu', document.querySelector('main')!));
  const noteId = decodeURIComponent(window.location.pathname.split('/').pop()!);
  assert.equal(getStoredDocuments().find(doc => doc.id === noteId)?.folderId, child.id);

  await click(document.querySelector('aside button[aria-label="Tùy chọn thư mục Sprint A"]'));
  await click(document.querySelector('button[aria-label="Xóa thư mục Sprint A"]'));
  const dialog = document.querySelector('[role="alertdialog"]')!;
  assert(dialog); assert(getStoredFolders().some(folder => folder.id === child.id));
  await click(button('Hủy', dialog));
  assert(getStoredFolders().some(folder => folder.id === child.id));
  await click(document.querySelector('aside button[aria-label="Tùy chọn thư mục Sprint A"]'));
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
  await click(document.querySelector('aside button[aria-label="Tùy chọn thư mục Công việc"]'));
  await click(document.querySelector('button[aria-label="Xóa thư mục Công việc"]'));
  await click(document.querySelector('button[aria-label="Đóng xác nhận xóa thư mục"]'));
  assert(getStoredFolders().some(folder => folder.id === 'fld_work'));
  await click(document.querySelector('aside button[aria-label="Tùy chọn thư mục Công việc"]'));
  await click(document.querySelector('button[aria-label="Xóa thư mục Công việc"]'));
  await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert(!document.querySelector('[role="alertdialog"]'));
  assert(getStoredFolders().some(folder => folder.id === 'fld_work'));
  const originalCount = getStoredDocuments().length;
  await click(document.querySelector('aside button[aria-label="Tùy chọn thư mục Công việc"]'));
  await click(document.querySelector('button[aria-label="Xóa thư mục Công việc"]'));
  await click(button('Xóa thư mục', document.querySelector('[role="alertdialog"]')!));
  assert.equal(window.location.pathname, '/library/private');
  assert(!getStoredFolders().some(folder => folder.id === 'fld_work'));
  assert(!getStoredDocuments().some(doc => doc.folderId === 'fld_work'));
  assert.equal(getStoredDocuments().length, originalCount);
});

test('immediate folder creation keeps saved defaults on Escape and avoids duplicate sibling names', async () => {
  const { getStoredFolders } = await import('../utils/storage');
  await mount('/library/private');
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  await click(button('Tạo thư mục', document.querySelector('[role="menu"]')!));
  const firstInput = document.querySelector('input[aria-label="Tên thư mục mới"]') as HTMLInputElement;
  assert.equal(firstInput, document.activeElement);
  assert.equal(firstInput.value, 'Thư mục mới');
  await act(async () => { firstInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert(getStoredFolders().some(folder => folder.parentId === 'fld_work' && folder.name === 'Thư mục mới'));
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  await click(button('Tạo thư mục', document.querySelector('[role="menu"]')!));
  const secondInput = document.querySelector('input[aria-label="Tên thư mục mới"]') as HTMLInputElement;
  assert.equal(secondInput.value, 'Thư mục mới 2');
  await act(async () => { secondInput.blur(); });
  assert.equal(document.querySelector('input[aria-label="Tên thư mục mới"]'), null);
  assert(getStoredFolders().some(folder => folder.parentId === 'fld_work' && folder.name === 'Thư mục mới 2'));
  await mount('/library/private');
  assert.equal(button('Thư mục mới', document.querySelector('aside')!), undefined);
  await click(document.querySelector('aside [aria-label="Mở thư mục Công việc"]'));
  assert(button('Thư mục mới', document.querySelector('aside')!));
  assert(button('Thư mục mới 2', document.querySelector('aside')!));
});

test('clicking tab Của tôi highlights it and plus creates a note at the top outside folders', async () => {
  await mount('/company');
  assert.equal(document.getElementById('space-tab-company')?.getAttribute('aria-selected'), 'true');
  await click(document.getElementById('space-tab-personal'));
  assert.equal(document.getElementById('space-tab-personal')?.getAttribute('aria-selected'), 'true');
  assert.equal(window.location.pathname, '/private');

  const personalPanel = document.getElementById('space-panel-personal')!;
  assert.equal(personalPanel.querySelector('[data-unclassified-space]'), null);
  const createNoteButton = personalPanel.querySelector('button[title="Tạo ghi chú mới"]')!;
  await click(createNoteButton);
  await click(button('Tạo tài liệu', personalPanel));

  const workFolder = personalPanel.querySelector('[data-folder-id="fld_work"]')!;
  assert(workFolder, 'Expected folder fld_work to exist');
  const noteTextElement = Array.from(personalPanel.querySelectorAll('span')).find(el => el.textContent === 'Ghi chú mới');
  assert(noteTextElement, 'Expected new note to be rendered in personal panel');
  const noteItem = noteTextElement.closest('[data-sidebar-document]')!;
  assert.equal(noteItem.parentElement?.firstElementChild, noteItem);
  assert(workFolder.compareDocumentPosition(noteItem) & Node.DOCUMENT_POSITION_PRECEDING, 'Expected new note to appear above folder Công việc');
});

test('both sidebars omit unclassified folders and place new notes at the top above folders', async () => {
  for (const useNewSidebar of [false, true]) {
    layoutConfig.useSidebar2 = useNewSidebar;
    try {
      for (const space of ['personal', 'company'] as const) {
        await mount(space === 'personal' ? '/private' : '/company');
        const panel = document.querySelector(`[data-space-panel="${space}"]`)!;
        assert.equal(panel.querySelector('[data-unclassified-space]'), null);
        assert.equal(panel.textContent?.includes('Chưa phân loại'), false);

        const before = new Set(getStoredDocuments().map(doc => doc.id));
        await click(panel.querySelector(`button[title="${space === 'personal' ? 'Tạo ghi chú mới' : 'Tạo tài liệu công ty mới'}"]`));
        assert.equal(getStoredDocuments().filter(doc => !before.has(doc.id)).length, 0, 'Opening the menu must not create a document');
        assert(button('Tạo thư mục', panel));
        await click(button('Tạo tài liệu', panel));
        const created = getStoredDocuments().find(doc => !before.has(doc.id))!;
        assert(created);
        assert.equal(created.space, space);
        assert.equal(created.folderId, null);

        const listContainer = panel.querySelector('[data-folder-id]')!.parentElement!;
        assert.equal(listContainer.firstElementChild?.getAttribute('data-sidebar-document'), created.id);

        const { getStoredFolders } = await import('../utils/storage');
        const previousFolders = new Set(getStoredFolders().map(folder => folder.id));
        await click(panel.querySelector(`button[title="${space === 'personal' ? 'Tạo ghi chú mới' : 'Tạo tài liệu công ty mới'}"]`));
        await click(button('Tạo thư mục', panel));
        const newFolder = getStoredFolders().find(folder => !previousFolders.has(folder.id))!;
        assert(newFolder);
        assert.equal(newFolder.space, space);
        assert.equal(newFolder.parentId ?? null, null);
        await nameNewFolder(`Thư mục đầu ${space} ${useNewSidebar ? '2' : '1'}`);
        const folderNodes = Array.from(listContainer.children).filter(el => el.hasAttribute('data-folder-id'));
        assert.equal(folderNodes[0]?.getAttribute('data-folder-id'), newFolder.id);
        assert.equal(panel.querySelector('[data-folder-id] .lucide-grip-vertical'), null);
        assert.equal(folderNodes[1]?.firstElementChild?.getAttribute('draggable'), 'true');
      }
    } finally { layoutConfig.useSidebar2 = false; }
  }
  await mount('/library/private');
  assert(!document.querySelector('aside')!.textContent?.includes('Gần đây'));
  assert.equal(document.querySelector('aside [aria-label="Danh sách gần đây"]'), null);
});

test('selecting text in block editor renders EditTextDialog with side-by-side submenu and closing on unselect', async () => {
  const initialDoc = getStoredDocuments().find(doc => doc.id === 'doc_week_plan')!;
  await mount(`/documents/${initialDoc.id}`);
  const textarea = document.querySelector('#document-editor-container textarea') as HTMLTextAreaElement;
  assert(textarea, 'Expected at least one textarea in document editor');
  assert(textarea.value.length >= 7, 'Expected textarea to contain initial document text');
  textarea.style.fontSize = '19px';
  await act(async () => {
    textarea.focus();
    textarea.setSelectionRange(0, 7);
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  let dialog = document.querySelector('[aria-label="Định dạng văn bản"]');
  assert(dialog, 'Expected EditTextDialog to open upon text selection');
  assert.equal(dialog.querySelector('input[placeholder="Tìm kiếm hành động…"]'), null);
  assert.equal((dialog.querySelector('[aria-label="Cỡ chữ"]') as HTMLSelectElement).value, '19');
  assert(!dialog.textContent?.includes('Tự động'));
  textarea.style.fontSize = '';
  assert(dialog.textContent?.includes('Định dạng'));
  assert(dialog.textContent?.includes('Màu'));
  for (const removed of ['Sao chép liên kết', 'Di chuyển đến', 'Bình luận', 'Đề xuất chỉnh sửa', 'Hỏi AI', 'Kỹ năng', 'Lần chỉnh sửa gần nhất', '7 ký tự']) assert(!dialog.textContent?.includes(removed));
  assert(dialog.textContent?.includes('Sao chép'));
  assert(dialog.textContent?.includes('Xóa'));
  // Submenu is closed initially; clicking 'Định dạng' opens menu cấp 2 side-by-side
  const turnIntoBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.includes('Định dạng'));
  assert(turnIntoBtn, 'Expected Định dạng button in menu cấp 1');
  await act(async () => {
    turnIntoBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert(dialog.textContent?.includes('Đề mục 1'));
  assert(!dialog.textContent?.includes('Danh sách có dấu đầu dòng'));
  for (const label of ['Văn bản', 'Đề mục 1', 'Đề mục 2', 'Đề mục 3', 'Đề mục 4']) assert(dialog.textContent?.includes(label));
  assert(!dialog.textContent?.includes('Trang trong'));

  for (const label of ['Đậm', 'Nghiêng', 'Gạch chân']) {
    await click(dialog.querySelector(`[aria-label="${label}"]`));
    assert.equal(dialog.querySelector(`[aria-label="${label}"]`)?.getAttribute('aria-pressed'), 'true');
  }
  for (const [label, value] of [['Font chữ', 'Georgia'], ['Cỡ chữ', '24']]) {
    const select = dialog.querySelector(`[aria-label="${label}"]`) as HTMLSelectElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!.call(select, value);
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    assert.equal(select.value, value);
  }
  const formatted = textarea.parentElement!;
  assert.equal(formatted.style.fontWeight, '700');
  assert.equal(formatted.style.fontFamily, 'Georgia');
  assert.equal(formatted.style.fontSize, '24px');
  assert.equal(formatted.style.fontStyle, 'italic');
  assert.equal(formatted.style.textDecoration, 'underline');

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
  await mount('/library/private');

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
  const testDoc = docs.find(d => !d.isTrash)!;
  assert(testDoc, 'Expected an active document to exist');

  await act(async () => {
    workFolderRow.dispatchEvent(createDragEvent('drop', {
      'text/plain': `doc:${testDoc.id}`,
      'text/document-id': testDoc.id,
      'application/x-doc-id': testDoc.id,
    }));
  });

  docs = getStoredDocuments();
  assert.equal(docs.find(d => d.id === testDoc.id)?.folderId, 'fld_work', 'Expected the document to be moved into fld_work');
});

test('scrolling to bottom of block editor automatically adds bottom whitespace and clicking it focuses a new line', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const docs = getStoredDocuments().filter(doc => !doc.isTrash);
  const firstDoc = {
    ...docs[0],
    id: 'scroll-whitespace-doc',
    blocks: [{ id: 'blk-last-text', type: 'paragraph' as const, content: 'Dòng cuối cùng' }],
  };
  const secondDoc = { ...docs[1], id: 'scroll-whitespace-doc-2' };
  saveStoredDocuments([firstDoc, secondDoc]);
  await mount('/documents/scroll-whitespace-doc');

  const spacer = document.querySelector<HTMLDivElement>('[data-editor-bottom-spacer]')!;
  const scrollContainer = spacer.parentElement!.parentElement as HTMLDivElement;
  assert.equal(spacer.style.minHeight, '120px');

  Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1200 });
  Object.defineProperty(scrollContainer, 'scrollTop', { configurable: true, writable: true, value: 580 });

  await act(async () => {
    scrollContainer.dispatchEvent(new window.Event('scroll', { bubbles: true }));
  });
  assert.equal(spacer.style.minHeight, '330px');

  Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1410 });
  scrollContainer.scrollTop = 800;
  await act(async () => {
    scrollContainer.dispatchEvent(new window.Event('scroll', { bubbles: true }));
  });
  assert.equal(spacer.style.minHeight, '540px');

  const initialBlocks = document.querySelectorAll('[data-block-id]').length;
  await click(spacer);
  assert.equal(document.querySelectorAll('[data-block-id]').length, initialBlocks + 1);
  assert.equal(document.activeElement, document.querySelectorAll('[data-block-id] textarea')[initialBlocks]);

  await mount('/documents/scroll-whitespace-doc-2');
  assert.equal(document.querySelector<HTMLDivElement>('[data-editor-bottom-spacer]')!.style.minHeight, '120px');
});

test('creating a new document focuses its title and pressing Enter saves immediately and moves to content', async () => {
  const existing = getStoredDocuments().find(doc => !doc.isTrash)!;
  await mount(`/documents/${existing.id}`);
  assert.equal(document.querySelector<HTMLElement>('aside')!.style.width, '320px');
  assert.notEqual(document.activeElement, document.querySelector('textarea[placeholder="Tiêu đề trang..."]'));

  assert.equal(document.querySelector('aside button[title="Hỏi AI"]'), null);
  assert.equal(document.querySelector('aside button[title="Tạo thư mục"]')?.textContent?.trim(), 'Tạo thư mục');

  await click(document.querySelector('aside button[title="Thao tác nhanh khác"]'));
  const sidebarQuickMenu = document.querySelector('#quick-action-dialog')!;
  assert.deepEqual(
    Array.from(sidebarQuickMenu.querySelectorAll('button:not([aria-label="Đóng thao tác nhanh"])')).map((btn) => btn.textContent?.trim()),
    ['Ghi chú cá nhân', 'Biên bản cuộc họp', 'Kế hoạch công việc', 'Kế hoạch tuần', 'Tài liệu nội bộ']
  );
  await click(button('Kế hoạch tuần', sidebarQuickMenu));
  assert.equal(document.querySelector('#quick-action-dialog'), null);
  assert(getStoredDocuments().some((doc) => doc.title === 'Kế hoạch tuần'));

  // Creating folder directly from top header button "Tạo thư mục"
  const { getStoredFolders } = await import('../utils/storage');
  const folderCountBefore = getStoredFolders().length;
  await click(document.querySelector('aside button[title="Tạo thư mục"]'));
  assert.equal(getStoredFolders().length, folderCountBefore + 1);

  await click(document.querySelector('aside button[title="Tạo tài liệu"]'));
  const titleInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Tiêu đề trang..."]')!;
  assert.equal(document.activeElement, titleInput);
  assert.equal(titleInput.selectionStart, 0);
  assert.equal(titleInput.selectionEnd, 'Ghi chú mới'.length);

  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(titleInput, 'Kế hoạch quý 4');
    titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => {
    titleInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });

  const newDocId = decodeURIComponent(window.location.pathname.split('/').pop()!);
  assert.equal(getStoredDocuments().find(doc => doc.id === newDocId)?.title, 'Kế hoạch quý 4');
  assert(document.querySelector('aside')?.textContent?.includes('Kế hoạch quý 4'));
  assert.equal(document.activeElement, document.querySelector('#document-editor-container textarea'));
});

test('callout block renders lightbulb icon and prominent border', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find(doc => !doc.isTrash)!;
  saveStoredDocuments([{ ...base, id: 'callout-test', blocks: [
    { id: 'callout-legacy', type: 'callout', content: 'Đây là khung chú thích mẫu', properties: { calloutType: 'info' } },
    { id: 'callout-input', type: 'paragraph', content: '' },
  ] }]);
  await mount('/documents/callout-test');

  const legacyCallout = document.querySelector('[data-block-id="callout-legacy"] [data-callout-box]')!;
  assert(legacyCallout);
  assert(legacyCallout.className.includes('border-[var(--ui-border-strong)]'));
  assert(legacyCallout.className.includes('border-[1.5px]'));
  assert.equal(legacyCallout.querySelector('span[aria-hidden="true"]')?.textContent, '💡');
  assert.equal(legacyCallout.querySelector('.lucide-sparkles'), null);

  const input = document.querySelector<HTMLTextAreaElement>('[data-block-id="callout-input"] textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(input, '/');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await click(document.querySelector('button[data-slash-command-title="Khung chú thích"]'));

  const newCallout = document.querySelector('[data-block-id="callout-input"] [data-callout-box]')!;
  assert(newCallout);
  assert.equal(newCallout.querySelector('span[aria-hidden="true"]')?.textContent, '💡');
  await mount('/library/private');
  assert.equal(getStoredDocuments().find(doc => doc.id === 'callout-test')?.blocks[1].properties?.calloutIcon, '💡');
});

test('sidebar footer buttons render icons only with hover tooltips in both sidebars', async () => {
  for (const useNewSidebar of [false, true]) {
    layoutConfig.useSidebar2 = useNewSidebar;
    try {
      await mount('/private');
      const sidebar = document.querySelector('aside')!;
      for (const [label, path] of [['Mẫu ghi chú', '/templates'], ['Thư viện', '/library/all'], ['Thùng rác', '/trash']] as const) {
        const btn = sidebar.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
        assert(btn, `Expected footer button ${label}`);
        assert.equal(btn.getAttribute('title'), null, 'Footer buttons should rely on a single custom hover tooltip without native title duplication');
        const labelSpan = btn.querySelector('.sr-only');
        assert.equal(labelSpan?.textContent, label);
        const tooltip = btn.parentElement?.querySelector('[role="tooltip"]');
        assert.equal(tooltip?.textContent, label);
        assert(tooltip?.className.includes('opacity-0'));
        assert(tooltip?.className.includes('group-hover/footer-item:opacity-100'));
        assert(!tooltip?.className.includes('group-focus-within'), 'Tooltip must hide when unhovered even if clicked button keeps focus');
        await click(btn);
        assert.equal(window.location.pathname, path);
      }

      const trashWrapper = sidebar.querySelector('button[aria-label="Thùng rác"]')!.parentElement!;
      const quickNoteBtn = sidebar.querySelector<HTMLButtonElement>('button[aria-label="Quick Note"]')!;
      assert(quickNoteBtn, 'Expected Quick Note footer button');
      assert.equal(trashWrapper.nextElementSibling, quickNoteBtn.parentElement, 'Quick Note should sit right after Thùng rác');
      assert.equal(quickNoteBtn.getAttribute('title'), null);
      assert(quickNoteBtn.querySelector('.lucide-pencil'));
      assert.equal(quickNoteBtn.querySelector('.sr-only')?.textContent, 'Quick Note');
      const quickNoteTooltip = quickNoteBtn.parentElement?.querySelector('[role="tooltip"]');
      assert(quickNoteTooltip?.textContent?.includes('Quick Note'));
      assert(quickNoteTooltip?.textContent?.includes('Ctrl + /'));
      assert(quickNoteTooltip?.className.includes('opacity-0'));
      assert(quickNoteTooltip?.className.includes('group-hover/footer-item:opacity-100'));
      assert(!quickNoteTooltip?.className.includes('group-focus-within'));
    } finally { layoutConfig.useSidebar2 = false; }
  }
});

test('Quick Note defaults to editor, avoids saving empty drafts, and switches cleanly between editor and recent notes', async () => {
  const { getStoredQuickNotes } = await import('../utils/quickNotes');
  const typeValue = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const proto = el instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };

  for (const useNewSidebar of [false, true]) {
    memoryStorage.clear();
    layoutConfig.useSidebar2 = useNewSidebar;
    try {
      await mount('/private');
      await click(document.querySelector('aside button[aria-label="Quick Note"]'));
      let modal = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
      assert(modal, 'Quick Note modal should open');
      assert.equal(modal.dataset.quickNoteView, 'editor', 'Must open directly into level 2 Note Editor');
      assert.equal(getStoredQuickNotes().length, 0, 'Must not save an empty record on open');

      // Back to Recent Notes without typing -> still zero records + empty state + Level 1 layout checks.
      await click(modal.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));
      modal = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
      assert.equal(modal.dataset.quickNoteView, 'recent');
      assert.equal(getStoredQuickNotes().length, 0);
      assert(modal.textContent?.includes('Ghi chú nhanh'));
      assert(modal.textContent?.includes('Chưa có ghi chú nhanh nào'));
      assert(button('Tạo mới', modal));
      // No close X button in level 1 header; uses fixed bottom footer ("Đóng menu" / "esc").
      assert.equal(modal.querySelector('button[aria-label="Đóng ghi chú nhanh"]'), null);
      const closeFooter = button('Đóng menu', modal) || Array.from(modal.querySelectorAll('button')).find(el => el.textContent?.includes('Đóng menu'))!;
      assert(closeFooter);
      assert(closeFooter.textContent?.includes('esc'));

      // Escape in Recent Notes closes Quick Note.
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      assert.equal(document.querySelector('[data-quick-note-modal]'), null);

      // Ctrl + / opens directly into Editor even after previous view was Recent Notes.
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '/', code: 'Slash', ctrlKey: true, bubbles: true, cancelable: true }));
      });
      modal = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
      assert.equal(modal.dataset.quickNoteView, 'editor');

      // Type Note 1 and test toolbar + Escape priority inside Editor.
      const firstBlockTextarea = () => document.querySelector<HTMLTextAreaElement>('[data-quick-note-modal] [data-block-id] textarea')!;
      assert.equal(document.activeElement, firstBlockTextarea(), 'Empty editor must focus the content input ready for immediate typing');
      await typeValue(firstBlockTextarea(), 'Ghi chú đầu tiên');

      // Escape in Editor opens/closes slash menu without closing modal or wiping text.
      await typeValue(firstBlockTextarea(), '/');
      assert(document.querySelector('[role="dialog"][aria-label="Chèn tiện ích nhanh"]'));
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      assert.equal(document.querySelector('[role="dialog"][aria-label="Chèn tiện ích nhanh"]'), null);
      assert(document.querySelector('[data-quick-note-modal]'), 'Escape in Editor must not close modal');
      await typeValue(firstBlockTextarea(), 'Ghi chú đầu tiên');

      // Press Escape with no inner popover open -> flushes safely without discarding content.
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      assert(document.querySelector('[data-quick-note-modal]'));
      assert.equal(getStoredQuickNotes().length, 1);

      // Go back via < -> Note 1 appears selected in Recent Notes.
      await click(modal.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));
      assert.equal(modal.dataset.quickNoteView, 'recent');
      const note1 = getStoredQuickNotes()[0];
      assert.equal(modal.querySelector(`[data-quick-note-item="${note1.id}"]`)?.getAttribute('data-selected'), 'true');

      // Click "Tạo mới" -> empty Editor without overwriting Note 1.
      await click(button('Tạo mới', modal));
      assert.equal(modal.dataset.quickNoteView, 'editor');
      const titleInput = modal.querySelector<HTMLInputElement>('input[aria-label="Tiêu đề ghi chú nhanh"]')!;
      assert.equal(titleInput.value, '');
      assert.equal(firstBlockTextarea().value, '');
      assert.equal(getStoredQuickNotes()[0].blocks[0].content, 'Ghi chú đầu tiên');

      await typeValue(titleInput, 'Kế hoạch tuần 46');
      await typeValue(firstBlockTextarea(), 'Cập nhật lô hàng');
      // Convert active block using toolbar Checklist & Text formatting & Color.
      await click(modal.querySelector('button[aria-label="Danh sách việc cần làm"]'));
      assert(modal.querySelector('[data-list-kind="checklist"]'));
      await click(modal.querySelector('button[aria-label="Định dạng văn bản"]'));
      await click(modal.querySelector('button[aria-label="Đậm"]'));
      await click(modal.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));

      assert.equal(getStoredQuickNotes().length, 2, 'Two distinct quick notes should be saved');

      // Search filters by title and content; empty search state works; clear restores all.
      const searchInput = modal.querySelector<HTMLInputElement>('input[placeholder="Tìm ghi chú..."]')!;
      await typeValue(searchInput, 'lô hàng');
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 230)); });
      assert.equal(modal.querySelectorAll('[data-quick-note-item]').length, 1);
      assert(modal.textContent?.includes('Kế hoạch tuần 46'));

      await typeValue(searchInput, 'từ khóa không khớp');
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 230)); });
      assert(modal.textContent?.includes('Không tìm thấy ghi chú phù hợp'));
      await click(modal.querySelector('button[aria-label="Xóa tìm kiếm"]'));

      // Clicking (...) on Note 1 must NOT open Editor; Pin option must be absent; test Escape & Rename.
      const menuBtn = modal.querySelector(`button[aria-label="Tùy chọn ghi chú Ghi chú đầu tiên"]`)!;
      await click(menuBtn);
      assert.equal(modal.dataset.quickNoteView, 'recent', 'Clicking item (...) button must not open editor');
      assert.equal(button('Ghim ghi chú'), undefined, 'Pin option must be removed from item menu');
      assert.equal(button('Bỏ ghim'), undefined, 'Unpin option must be removed from item menu');
      assert(button('Sao chép nội dung'), 'Copy formatted option should appear in item menu');
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      assert(document.querySelector('[data-quick-note-modal]'), 'Escape from item menu must only close the menu');

      // Rename Note 1 (and check RenameDialog Escape doesn't close QuickNoteModal).
      await click(modal.querySelector(`button[aria-label="Tùy chọn ghi chú Ghi chú đầu tiên"]`));
      await click(button('Đổi tên'));
      const renameInput = document.querySelector<HTMLInputElement>('input[aria-label="Tên ghi chú"]')!;
      assert(renameInput);
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      assert.equal(document.querySelector('[role="dialog"][aria-label="Đặt lại tên ghi chú"]'), null);
      assert(document.querySelector('[data-quick-note-modal]'), 'Closing RenameDialog must keep QuickNoteModal open');

      await click(modal.querySelector(`button[aria-label="Tùy chọn ghi chú Ghi chú đầu tiên"]`));
      await click(button('Đổi tên'));
      await typeValue(document.querySelector<HTMLInputElement>('input[aria-label="Tên ghi chú"]')!, 'Ghi chú đã đổi tên');
      await click(button('Lưu'));
      assert.equal(getStoredQuickNotes().find(n => n.id === note1.id)?.title, 'Ghi chú đã đổi tên');

      // Open Note 2 ("Kế hoạch tuần 46") -> loads correctly without creating duplicate records.
      const note2 = getStoredQuickNotes().find(n => n.title === 'Kế hoạch tuần 46')!;
      await click(modal.querySelector(`[data-quick-note-item="${note2.id}"]`));
      assert.equal(modal.dataset.quickNoteView, 'editor');
      assert.equal(modal.querySelector<HTMLInputElement>('input[aria-label="Tiêu đề ghi chú nhanh"]')?.value, 'Kế hoạch tuần 46');
      assert(modal.querySelector('[data-list-kind="checklist"]'));
      assert.equal(getStoredQuickNotes().length, 2);

      // Maximize & restore without breaking dialog.
      await click(modal.querySelector('button[aria-label="Phóng to"]'));
      assert(modal.className.includes('max-w-[820px]'));
      await click(modal.querySelector('button[aria-label="Thu nhỏ"]'));
      assert(modal.className.includes('max-w-[460px]'));

      // Promote Quick Note into workspace ("Lưu vào Ghi chép của tôi").
      const docsBeforePromote = getStoredDocuments().length;
      await click(modal.querySelector('button[aria-label="Tùy chọn ghi chú"]'));
      await click(button('Lưu vào Ghi chép của tôi'));
      assert.equal(getStoredDocuments().length, docsBeforePromote + 1);
      assert(getStoredDocuments().some(doc => doc.space === 'personal' && doc.folderId === null && doc.title === 'Kế hoạch tuần 46'));

      // Deleting the currently open note clears activeNoteId and goes cleanly back to Recent Notes.
      await click(modal.querySelector('button[aria-label="Tùy chọn ghi chú"]'));
      await click(button('Xóa ghi chú'));
      assert.equal(modal.dataset.quickNoteView, 'recent');
      assert.equal(getStoredQuickNotes().length, 1);

      // Close via "Đóng menu", then Ctrl + / opens fresh blank Editor (not deleted Note 2).
      await click(Array.from(modal.querySelectorAll('button')).find(el => el.textContent?.includes('Đóng menu'))!);
      assert.equal(document.querySelector('[data-quick-note-modal]'), null);
      await act(async () => {
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '/', code: 'Slash', ctrlKey: true, bubbles: true, cancelable: true }));
      });
      modal = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
      assert.equal(modal.dataset.quickNoteView, 'editor');
      assert.equal(modal.querySelector<HTMLInputElement>('input[aria-label="Tiêu đề ghi chú nhanh"]')?.value, '');
    } finally { layoutConfig.useSidebar2 = false; }
  }
});

test('Quick Note prevents autosave race conditions and preserves content on failed saves', async () => {
  const { QuickNoteModal } = await import('../components/modals/QuickNoteModal');
  const { createRoot: makeRoot } = await import('react-dom/client');

  let stored: import('../types').QuickNote[] = [];
  const pendingSaves: Array<{ note: import('../types').QuickNote; resolve: () => void; reject: (err: Error) => void }> = [];
  let shouldReject = false;

  const controlledSave = (note: import('../types').QuickNote) =>
    new Promise<import('../types').QuickNote>((resolve, reject) => {
      if (shouldReject) {
        reject(new Error('Lỗi kết nối máy chủ'));
        return;
      }
      pendingSaves.push({
        note,
        resolve: () => {
          const idx = stored.findIndex(item => item.id === note.id);
          if (idx >= 0) stored[idx] = note; else stored = [note, ...stored];
          resolve(note);
        },
        reject,
      });
    });

  if (root) await act(async () => root!.unmount());
  const host = document.getElementById('root')!;
  root = makeRoot(host);
  await act(async () => {
    root!.render(
      <QuickNoteModal
        isOpen={true}
        onClose={() => {}}
        loadNotes={async () => stored}
        saveNote={controlledSave}
        autosaveDelayMs={80}
      />
    );
  });
  // Allow async initial load to settle.
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });

  const typeBlock = async (val: string) => {
    const textarea = document.querySelector<HTMLTextAreaElement>('[data-quick-note-modal] [data-block-id] textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, val);
      textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };

  // Trigger save V1 (slow, unresolved), then rapidly edit V2 and flush.
  await typeBlock('Phiên bản V1');
  await act(async () => { await new Promise(r => setTimeout(r, 110)); });
  assert.equal(pendingSaves.length, 1);

  await typeBlock('Phiên bản V2');
  const backBtn = document.querySelector<HTMLButtonElement>('[data-quick-note-modal] button[aria-label="Quay lại ghi chú gần đây"]')!;
  await act(async () => {
    backBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(pendingSaves.length, 2);

  // Resolve newer V2 first, then reject stale V1 late -> V2 must survive with no error banner!
  await act(async () => {
    pendingSaves[1].resolve();
    pendingSaves[0].reject(new Error('Stale V1 timeout'));
    await new Promise(r => setTimeout(r, 10));
  });

  const modal = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
  assert.equal(modal.dataset.quickNoteView, 'recent');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].blocks[0].content, 'Phiên bản V2');
  assert.equal(document.querySelector('[data-quick-note-modal] [role="alert"]'), null);

  // Now simulate failing save -> must show error alert and preserve unsaved edits in Editor.
  await click(button('Tạo mới', modal));
  shouldReject = true;
  await typeBlock('Nội dung quan trọng chưa lưu');
  await click(document.querySelector('[data-quick-note-modal] button[aria-label="Quay lại ghi chú gần đây"]'));

  const alert = document.querySelector('[data-quick-note-modal] [role="alert"]');
  assert(alert?.textContent?.includes('Lỗi kết nối máy chủ'));
  assert.equal(document.querySelector<HTMLElement>('[data-quick-note-modal]')?.dataset.quickNoteView, 'editor', 'Must stay in editor so unsaved text is not silently lost');
  assert.equal(document.querySelector<HTMLTextAreaElement>('[data-quick-note-modal] [data-block-id] textarea')?.value, 'Nội dung quan trọng chưa lưu');

  // Recover on Retry -> succeeds cleanly.
  shouldReject = false;
  await click(button('Thử lại', alert!));
  await act(async () => {
    while (pendingSaves.length > 2) pendingSaves.pop()!.resolve();
  });
  assert.equal(document.querySelector('[data-quick-note-modal] [role="alert"]'), null);
  assert.equal(stored.length, 2);
});

test('Quick Note renders as a draggable non-modal dialog while underlying screens remain interactive', async () => {
  memoryStorage.clear();
  await mount('/documents/doc_week_plan');
  await click(document.querySelector('aside button[aria-label="Quick Note"]'));

  const dialog = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
  assert(dialog);
  assert.equal(dialog.getAttribute('aria-modal'), 'false');
  assert.equal(dialog.parentElement?.className.includes('inset-0'), false, 'Should not render a blocking full-screen backdrop');

  const initialLeft = parseFloat(dialog.style.left);
  const initialTop = parseFloat(dialog.style.top);
  assert(Number.isFinite(initialLeft) && Number.isFinite(initialTop));

  // Drag dialog header to reposition cleanly.
  const handle = dialog.querySelector<HTMLElement>('[data-quick-note-drag-handle]')!;
  await act(async () => {
    handle.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 500, clientY: 300 }));
  });
  await act(async () => {
    window.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 380, clientY: 220 }));
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });

  const movedLeft = parseFloat(dialog.style.left);
  const movedTop = parseFloat(dialog.style.top);
  assert.equal(movedLeft, Math.max(8, initialLeft - 120));
  assert.equal(movedTop, Math.max(8, initialTop - 80));

  // Dragging starting on an interactive header button (<) must NOT drag the dialog.
  const backBtn = dialog.querySelector<HTMLButtonElement>('button[aria-label="Quay lại ghi chú gần đây"]')!;
  await act(async () => {
    backBtn.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 250, clientY: 250 }));
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  assert.equal(parseFloat(dialog.style.left), movedLeft);

  // Switch to level 1 recent view via < and verify dragged position stays unchanged.
  await click(backBtn);
  assert.equal(dialog.dataset.quickNoteView, 'recent');
  assert.equal(parseFloat(dialog.style.left), movedLeft);
  assert.equal(parseFloat(dialog.style.top), movedTop);

  // Background screens underneath remain completely clickable and editable while Quick Note stays open!
  const docTitleInput = document.querySelector<HTMLTextAreaElement>('main textarea[aria-label="Tiêu đề ghi chú"]')!;
  await act(async () => {
    docTitleInput.focus();
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(docTitleInput, 'Đã sửa ở nền');
    docTitleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(docTitleInput.value, 'Đã sửa ở nền');
  assert(document.querySelector('[data-quick-note-modal]'), 'Interacting with main document must keep Quick Note open');

  // Escape pressed while background workspace editor holds focus must NOT close floating Quick Note.
  await act(async () => {
    docTitleInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
  assert(document.querySelector('[data-quick-note-modal]'));

  // Clicking sidebar footer underneath navigates without closing Quick Note.
  await click(document.querySelector('aside button[aria-label="Thư viện"]'));
  assert.equal(window.location.pathname, '/library/all');
  assert(document.querySelector('[data-quick-note-modal]'));
});

test('Quick Note removes Pin controls and preserves exact formatting when copying content to another document', async () => {
  const { saveStoredDocuments, getStoredDocuments } = await import('../utils/storage');
  const { saveStoredQuickNotes } = await import('../utils/quickNotes');
  const { clearCopiedBlocksBridge } = await import('../utils/blockClipboard');
  clearCopiedBlocksBridge();

  const now = '2026-11-11T10:30:00.000Z';
  const base = getStoredDocuments().find((doc) => !doc.isTrash && doc.space === 'personal') || getStoredDocuments().find((doc) => !doc.isTrash)!;
  saveStoredDocuments([
    {
      ...base,
      id: 'target-doc-1',
      title: 'Tài liệu đích 1',
      space: 'personal',
      folderId: null,
      isPrivate: true,
      blocks: [{ id: 'target-empty-blk', type: 'paragraph', content: '' }],
    },
    {
      ...base,
      id: 'target-doc-2',
      title: 'Tài liệu đích 2',
      space: 'personal',
      folderId: null,
      isPrivate: true,
      blocks: [{ id: 'target-existing-blk', type: 'paragraph', content: 'Đoạn mở đầu sẵn có' }],
    },
  ]);

  saveStoredQuickNotes([
    {
      id: 'qn-formatted-1',
      title: 'Ghi chú định dạng chuẩn',
      icon: '📝',
      createdAt: now,
      updatedAt: now,
      blocks: [
        {
          id: 'qf-h1',
          type: 'h1',
          content: 'Tiêu đề lớn màu xanh',
          properties: { bold: true, textColor: '#1E3A8A' },
        },
        {
          id: 'qf-styled',
          type: 'paragraph',
          content: 'Nhấn mạnh có nền vàng',
          properties: {
            italic: true,
            underline: true,
            backgroundColor: '#FEF3C7',
            fontFamily: 'Serif',
            fontSize: 18,
          },
        },
        {
          id: 'qf-check',
          type: 'checklist',
          content: 'Hoàn tất bàn giao',
          properties: { checked: true },
        },
        {
          id: 'qf-bullet',
          type: 'bullet',
          content: 'Gửi team QA',
        },
      ],
    },
  ]);

  const origClipboardDesc = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const origClipboardItemDesc = Object.getOwnPropertyDescriptor(globalThis, 'ClipboardItem');

  class FakeClipboardItem {
    readonly items: Record<string, Blob>;
    constructor(items: Record<string, Blob>) {
      this.items = items;
    }
  }

  let writtenHtml = '';
  let writtenPlain = '';
  let writeMode: 'rich' | 'text-only' | 'deny' = 'rich';

  const makeDataTransfer = (initial: Record<string, string> = {}) => {
    const map = new Map<string, string>(Object.entries(initial));
    return {
      getData: (type: string) => map.get(type) ?? '',
      setData: (type: string, value: string) => {
        map.set(type, value);
      },
    };
  };

  Object.defineProperty(globalThis, 'ClipboardItem', {
    configurable: true,
    writable: true,
    value: FakeClipboardItem,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      write: async (items: FakeClipboardItem[]) => {
        if (writeMode === 'deny') {
          throw new Error('NotAllowedError: Permission denied');
        }
        if (writeMode === 'text-only') {
          throw new TypeError('ClipboardItem write unavailable');
        }
        const first = items[0];
        writtenHtml = await first.items['text/html'].text();
        writtenPlain = await first.items['text/plain'].text();
      },
      writeText: async (text: string) => {
        if (writeMode === 'deny') {
          throw new Error('Permission denied');
        }
        writtenPlain = text;
      },
    },
  });

  try {
    await mount('/documents/target-doc-1');
    await click(document.querySelector('aside button[aria-label="Quick Note"]'));
    const dialog = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
    assert(dialog);

    // Zero Pin controls in Level 2 header, Level 1 items, or (...) menus.
    assert.equal(dialog.querySelector('button[aria-label*="ghim"], button[aria-label*="Ghim"]'), null);
    await click(dialog.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));
    assert.equal(dialog.querySelector('[aria-label="Đã ghim"]'), null);

    await click(dialog.querySelector('[data-quick-note-item="qn-formatted-1"]'));
    assert.equal(dialog.dataset.quickNoteView, 'editor');
    await click(dialog.querySelector('button[aria-label="Tùy chọn ghi chú"]'));
    assert.equal(button('Ghim ghi chú'), undefined);
    assert.equal(button('Bỏ ghim'), undefined);
    assert(button('Sao chép nội dung'));
    await click(dialog.querySelector('button[aria-label="Tùy chọn ghi chú"]'));

    // Path 1: Toolbar copy ("Sao chép nội dung") -> paste into empty target-doc-1 replaces blank paragraph cleanly.
    await click(dialog.querySelector('button[aria-label="Sao chép nội dung"]'));
    assert(writtenHtml.includes('data-misa-blocks='), 'Expected embedded structured block payload in clipboard HTML');
    assert(writtenPlain.includes('# Tiêu đề lớn màu xanh'));
    assert(writtenPlain.includes('- [x] Hoàn tất bàn giao'));
    assert(document.body.textContent?.includes('Đã sao chép nội dung giữ nguyên định dạng'));

    const doc1Textarea = document.querySelector<HTMLTextAreaElement>(
      '#document-editor-container [data-block-id="target-empty-blk"] textarea'
    )!;
    assert(doc1Textarea);
    const richDt = makeDataTransfer({ 'text/html': writtenHtml, 'text/plain': writtenPlain });
    const pasteEvent1 = new window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent1, 'clipboardData', { value: richDt });
    await act(async () => {
      doc1Textarea.focus();
      doc1Textarea.dispatchEvent(pasteEvent1);
    });
    assert.equal(pasteEvent1.defaultPrevented, true, 'Rich paste must intercept default textarea paste');

    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
    const savedDoc1 = getStoredDocuments().find((d) => d.id === 'target-doc-1')!;
    assert.equal(savedDoc1.blocks.length, 4);
    assert.equal(savedDoc1.blocks[0].type, 'h1');
    assert.equal(savedDoc1.blocks[0].content, 'Tiêu đề lớn màu xanh');
    assert.equal(savedDoc1.blocks[0].properties?.bold, true);
    assert.equal(savedDoc1.blocks[0].properties?.textColor, '#1E3A8A');
    assert.equal(savedDoc1.blocks[1].type, 'paragraph');
    assert.equal(savedDoc1.blocks[1].properties?.italic, true);
    assert.equal(savedDoc1.blocks[1].properties?.underline, true);
    assert.equal(savedDoc1.blocks[1].properties?.backgroundColor, '#FEF3C7');
    assert.equal(savedDoc1.blocks[1].properties?.fontFamily, 'Serif');
    assert.equal(savedDoc1.blocks[1].properties?.fontSize, 18);
    assert.equal(savedDoc1.blocks[2].type, 'checklist');
    assert.equal(savedDoc1.blocks[2].properties?.checked, true);
    assert.equal(savedDoc1.blocks[3].type, 'bullet');

    // Path 2: writeText-only copy from Recent Notes (...) menu -> paste into target-doc-2 restores formatting via bridge.
    writeMode = 'text-only';
    writtenHtml = '';
    writtenPlain = '';
    await click(dialog.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));
    await click(dialog.querySelector('button[aria-label="Tùy chọn ghi chú Ghi chú định dạng chuẩn"]'));
    await click(button('Sao chép nội dung'));
    assert(writtenPlain.includes('Nhấn mạnh có nền vàng'));

    const sidebarDoc2 =
      document.querySelector('[data-sidebar-document="target-doc-2"]') ||
      button('Tài liệu đích 2', document.querySelector('aside')!);
    await click(sidebarDoc2);
    assert.equal(window.location.pathname, '/documents/target-doc-2');

    const doc2Textarea = document.querySelector<HTMLTextAreaElement>(
      '#document-editor-container [data-block-id="target-existing-blk"] textarea'
    )!;
    const plainBridgeDt = makeDataTransfer({ 'text/plain': writtenPlain });
    const pasteEvent2 = new window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent2, 'clipboardData', { value: plainBridgeDt });
    await act(async () => {
      doc2Textarea.focus();
      doc2Textarea.dispatchEvent(pasteEvent2);
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
    const savedDoc2 = getStoredDocuments().find((d) => d.id === 'target-doc-2')!;
    assert.equal(savedDoc2.blocks.length, 5);
    assert.equal(savedDoc2.blocks[0].content, 'Đoạn mở đầu sẵn có');
    assert.equal(savedDoc2.blocks[1].type, 'h1');
    assert.equal(savedDoc2.blocks[2].properties?.backgroundColor, '#FEF3C7');
    assert.equal(savedDoc2.blocks[3].properties?.checked, true);

    // Path 3: Ctrl+C (copy event) on formatted block in Quick Note -> paste slice keeps formatting in target-doc-2.
    await click(dialog.querySelector('[data-quick-note-item="qn-formatted-1"]'));
    const qStyledTextarea = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="qf-styled"] textarea')!;
    const copyDt = makeDataTransfer();
    const copyEvt = new window.Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvt, 'clipboardData', { value: copyDt });
    await act(async () => {
      qStyledTextarea.focus();
      qStyledTextarea.setSelectionRange(0, 9);
      qStyledTextarea.dispatchEvent(copyEvt);
    });
    assert.equal(copyEvt.defaultPrevented, true);
    assert(copyDt.getData('text/html').includes('data-misa-blocks='));

    const doc2LastTextarea = document.querySelector<HTMLTextAreaElement>(
      `#document-editor-container [data-block-id="${savedDoc2.blocks[savedDoc2.blocks.length - 1].id}"] textarea`
    )!;
    const pasteSliceDt = makeDataTransfer({
      'text/html': copyDt.getData('text/html'),
      'text/plain': copyDt.getData('text/plain'),
    });
    const pasteEvt3 = new window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvt3, 'clipboardData', { value: pasteSliceDt });
    await act(async () => {
      doc2LastTextarea.focus();
      doc2LastTextarea.dispatchEvent(pasteEvt3);
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
    const savedDoc2AfterSlice = getStoredDocuments().find((d) => d.id === 'target-doc-2')!;
    const appendedSliceBlock = savedDoc2AfterSlice.blocks[savedDoc2AfterSlice.blocks.length - 1];
    assert.equal(appendedSliceBlock.content, 'Nhấn mạnh');
    assert.equal(appendedSliceBlock.properties?.italic, true);
    assert.equal(appendedSliceBlock.properties?.underline, true);
    assert.equal(appendedSliceBlock.properties?.backgroundColor, '#FEF3C7');

    // Path 4: Clipboard permission error must report an error toast without false check state.
    writeMode = 'deny';
    await click(dialog.querySelector('button[aria-label="Sao chép nội dung"]'));
    assert(document.body.textContent?.includes('từ chối quyền Clipboard'));
    assert.equal(
      dialog.querySelector('button[aria-label="Sao chép nội dung"]')?.getAttribute('title'),
      'Sao chép nội dung giữ nguyên định dạng'
    );
  } finally {
    clearCopiedBlocksBridge();
    if (origClipboardDesc) Object.defineProperty(navigator, 'clipboard', origClipboardDesc);
    else delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    if (origClipboardItemDesc) Object.defineProperty(globalThis, 'ClipboardItem', origClipboardItemDesc);
    else delete (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem;
  }
});

test('Quick Note auto-centers on open and supports full multi-block selection highlight across lines', async () => {
  const { saveStoredDocuments, getStoredDocuments } = await import('../utils/storage');
  const { saveStoredQuickNotes } = await import('../utils/quickNotes');
  const { clearCopiedBlocksBridge } = await import('../utils/blockClipboard');
  clearCopiedBlocksBridge();

  const now = '2026-11-11T12:15:00.000Z';
  const base = getStoredDocuments().find((doc) => !doc.isTrash && doc.space === 'personal') || getStoredDocuments().find((doc) => !doc.isTrash)!;
  saveStoredDocuments([
    {
      ...base,
      id: 'multi-sel-doc',
      title: 'Tài liệu bôi đen',
      space: 'personal',
      folderId: null,
      isPrivate: true,
      blocks: [
        { id: 'ms-doc-1', type: 'h2', content: 'Tiêu đề tài liệu', properties: { bold: true } },
        { id: 'ms-doc-2', type: 'paragraph', content: 'Dòng nội dung thứ hai' },
        { id: 'ms-doc-3', type: 'checklist', content: 'Việc cần làm', properties: { checked: true } },
      ],
    },
  ]);

  saveStoredQuickNotes([
    {
      id: 'qn-multi-sel',
      title: 'Ghi chú nhiều dòng',
      icon: '📝',
      createdAt: now,
      updatedAt: now,
      blocks: [
        { id: 'qm-1', type: 'h1', content: 'Dòng 1 tiêu đề', properties: { bold: true, textColor: '#1E3A8A' } },
        { id: 'qm-2', type: 'paragraph', content: 'Dòng 2 văn bản', properties: { italic: true } },
        { id: 'qm-3', type: 'checklist', content: 'Dòng 3 checklist', properties: { checked: true } },
        { id: 'qm-4', type: 'bullet', content: 'Dòng 4 gạch đầu dòng' },
      ],
    },
  ]);

  const makeDataTransfer = (initial: Record<string, string> = {}) => {
    const map = new Map<string, string>(Object.entries(initial));
    return {
      getData: (type: string) => map.get(type) ?? '',
      setData: (type: string, value: string) => {
        map.set(type, value);
      },
    };
  };

  await mount('/documents/multi-sel-doc');
  await click(document.querySelector('aside button[aria-label="Quick Note"]'));
  let dialog = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
  assert(dialog);

  // 1. Opening Quick Note auto-centers dialog in the middle of viewport.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = parseFloat(dialog.style.width);
  const height = parseFloat(dialog.style.height);
  assert.equal(parseFloat(dialog.style.left), Math.max(8, Math.round((vw - width) / 2)));
  assert.equal(parseFloat(dialog.style.top), Math.max(8, Math.round((vh - height) / 2)));

  // Drag dialog away, close it, and reopen -> must auto-center again.
  const handle = dialog.querySelector<HTMLElement>('[data-quick-note-drag-handle]')!;
  await act(async () => {
    handle.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 500, clientY: 300 }));
  });
  await act(async () => {
    window.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 200 }));
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  assert.notEqual(parseFloat(dialog.style.left), Math.max(8, Math.round((vw - width) / 2)));

  await click(dialog.querySelector('button[aria-label="Đóng ghi chú nhanh"]'));
  assert.equal(document.querySelector('[data-quick-note-modal]'), null);

  await click(document.querySelector('aside button[aria-label="Quick Note"]'));
  dialog = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
  assert(dialog);
  assert.equal(parseFloat(dialog.style.left), Math.max(8, Math.round((vw - width) / 2)));
  assert.equal(parseFloat(dialog.style.top), Math.max(8, Math.round((vh - height) / 2)));

  // Load 4-block note from Recent Notes.
  await click(dialog.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));
  await click(dialog.querySelector('[data-quick-note-item="qn-multi-sel"]'));

  // 2. Ctrl+A inside Quick Note highlights ALL 4 blocks ("hiệu ứng bôi đen toàn bộ") rather than 1 line,
  // while editor body uses compact symmetric px-[5%] side padding without pl-14 / -ml-14 indentation.
  const qEditorBody = dialog.querySelector<HTMLElement>('[data-quick-note-editor-body]')!;
  assert(qEditorBody.className.includes('px-[5%]'));
  const qContainer = dialog.querySelector<HTMLElement>('[data-has-multi-selection]') ?? dialog.querySelector<HTMLElement>('[tabindex="-1"]')!;
  assert(!qContainer.className.includes('pl-14'));
  assert(!dialog.querySelector('[data-block-id="qm-1"]')?.className.includes('-ml-14'));
  const qFirstTextarea = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="qm-1"] textarea')!;
  await act(async () => {
    qFirstTextarea.focus();
    qFirstTextarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true, cancelable: true }));
  });
  const selectedBlocksAfterCtrlA = dialog.querySelectorAll('[data-block-id][data-block-selected="true"]');
  assert.equal(selectedBlocksAfterCtrlA.length, 4, 'Ctrl+A must select and highlight all 4 blocks');
  assert.equal(dialog.querySelectorAll('[data-block-selection-highlight="true"]').length, 4);

  // Copy highlighted blocks via native copy event -> paste replaces/inserts formatted blocks cleanly.
  const copyDt = makeDataTransfer();
  const copyEvt = new window.Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(copyEvt, 'clipboardData', { value: copyDt });
  await act(async () => {
    (document.activeElement as HTMLElement || qContainer).dispatchEvent(copyEvt);
  });
  assert.equal(copyEvt.defaultPrevented, true);
  assert(copyDt.getData('text/plain').includes('Dòng 1 tiêu đề'));
  assert(copyDt.getData('text/plain').includes('Dòng 4 gạch đầu dòng'));

  // Escape clears multi-block highlight without closing Quick Note.
  await act(async () => {
    (document.activeElement as HTMLElement || qContainer).dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
  });
  assert.equal(dialog.querySelectorAll('[data-block-selected="true"]').length, 0);
  assert(document.querySelector('[data-quick-note-modal]'));

  // 3. Mouse drag across blocks selects contiguous range [qm-1..qm-3] with highlight effect.
  // Also simulate browser layout rects + textarea mouse-capture where move target stays on q1 while clientY drags down to q3.
  const blockEls = ['qm-1', 'qm-2', 'qm-3', 'qm-4'].map((id) => dialog.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!);
  blockEls.forEach((el, idx) => {
    const top = idx * 32;
    const bottom = top + 30;
    Object.defineProperty(el, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top, bottom, left: 0, right: 300, width: 300, height: 30, x: 0, y: top, toJSON: () => ({}) }),
    });
  });

  const q1 = dialog.querySelector<HTMLElement>('[data-block-id="qm-1"] textarea')!;
  await act(async () => {
    q1.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 20, clientY: 12 }));
  });
  await act(async () => {
    q1.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 25, clientY: 75 }));
  });
  await act(async () => {
    window.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  });
  assert.deepEqual(
    Array.from(dialog.querySelectorAll<HTMLElement>('[data-block-selected="true"]')).map((el) => el.dataset.blockId),
    ['qm-1', 'qm-2', 'qm-3']
  );

  // Backspace deletes the 3 highlighted blocks, leaving only qm-4 cleanly.
  await act(async () => {
    (document.activeElement as HTMLElement || qContainer).dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
    );
  });
  assert.equal(dialog.querySelectorAll('[data-block-id]').length, 1);
  assert(dialog.querySelector('[data-block-id="qm-4"]'));

  // 4. Main document editor (#document-editor-container) also highlights all blocks on Ctrl+A and replaces them cleanly on Paste.
  const docContainer = document.querySelector<HTMLElement>('#document-editor-container')!;
  const docTextarea = docContainer.querySelector<HTMLTextAreaElement>('[data-block-id="ms-doc-1"] textarea')!;
  await act(async () => {
    docTextarea.focus();
    docTextarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true, cancelable: true }));
  });
  assert.equal(docContainer.querySelectorAll('[data-block-id][data-block-selected="true"]').length, 3);

  const pasteDt = makeDataTransfer({
    'text/html': copyDt.getData('text/html'),
    'text/plain': copyDt.getData('text/plain'),
  });
  const pasteEvt = new window.Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(pasteEvt, 'clipboardData', { value: pasteDt });
  await act(async () => {
    docContainer.dispatchEvent(pasteEvt);
  });
  assert.equal(pasteEvt.defaultPrevented, true);
  assert.equal(docContainer.querySelectorAll('[data-block-selected="true"]').length, 0);

  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
  const updatedDoc = getStoredDocuments().find((d) => d.id === 'multi-sel-doc')!;
  assert.equal(updatedDoc.blocks.length, 4, 'Pasting over selected doc blocks must replace them with the 4 formatted blocks');
  assert.equal(updatedDoc.blocks[0].type, 'h1');
  assert.equal(updatedDoc.blocks[0].properties?.textColor, '#1E3A8A');
  assert.equal(updatedDoc.blocks[2].type, 'checklist');
  assert.equal(updatedDoc.blocks[2].properties?.checked, true);
});

test('Backspace on empty line, line start, and empty list item deletes/merges onto end of previous block in both Quick Note and BlockEditor', async () => {
  const { saveStoredDocuments, getStoredDocuments } = await import('../utils/storage');
  const { saveStoredQuickNotes } = await import('../utils/quickNotes');

  const now = '2026-11-11T13:50:00.000Z';
  const base = getStoredDocuments().find((doc) => !doc.isTrash && doc.space === 'personal') || getStoredDocuments().find((doc) => !doc.isTrash)!;
  saveStoredDocuments([
    {
      ...base,
      id: 'backspace-doc',
      title: 'Tài liệu Backspace',
      space: 'personal',
      folderId: null,
      isPrivate: true,
      blocks: [
        { id: 'bs-doc-1', type: 'paragraph', content: 'Đoạn 1' },
        { id: 'bs-doc-2', type: 'paragraph', content: '' },
        { id: 'bs-doc-3', type: 'paragraph', content: 'tiếp theo' },
      ],
    },
  ]);

  saveStoredQuickNotes([
    {
      id: 'qn-backspace',
      title: 'Quick Note Backspace',
      icon: '📝',
      createdAt: now,
      updatedAt: now,
      blocks: [
        { id: 'bs-q-1', type: 'paragraph', content: 'hahah' },
        { id: 'bs-q-2', type: 'paragraph', content: '' },
        { id: 'bs-q-3', type: 'paragraph', content: 'hehe' },
        {
          id: 'bs-q-4',
          type: 'bullet',
          content: '',
          properties: { listItems: [{ id: 'bs-q-4-item', content: '' }] },
        },
      ],
    },
  ]);

  await mount('/documents/backspace-doc');

  // 1. Main document (BlockEditor): Backspace on empty block 2 deletes it and places caret at END of block 1 ("Đoạn 1|").
  const docInput2 = document.querySelector<HTMLTextAreaElement>('#document-editor-container [data-block-id="bs-doc-2"] textarea')!;
  await act(async () => {
    docInput2.focus();
    docInput2.setSelectionRange(0, 0);
    docInput2.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  assert.equal(document.querySelector('[data-block-id="bs-doc-2"]'), null);
  const docInput1AfterEmpty = document.querySelector<HTMLTextAreaElement>('#document-editor-container [data-block-id="bs-doc-1"] textarea')!;
  assert.equal(document.activeElement, docInput1AfterEmpty);
  assert.equal(docInput1AfterEmpty.selectionStart, 'Đoạn 1'.length);
  assert.equal(docInput1AfterEmpty.selectionEnd, 'Đoạn 1'.length);

  // Backspace at offset 0 of non-empty block 3 ("tiếp theo") merges onto block 1 with caret at exact junction ("Đoạn 1|tiếp theo").
  const docInput3 = document.querySelector<HTMLTextAreaElement>('#document-editor-container [data-block-id="bs-doc-3"] textarea')!;
  await act(async () => {
    docInput3.focus();
    docInput3.setSelectionRange(0, 0);
    docInput3.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  assert.equal(document.querySelector('[data-block-id="bs-doc-3"]'), null);
  const docInput1Merged = document.querySelector<HTMLTextAreaElement>('#document-editor-container [data-block-id="bs-doc-1"] textarea')!;
  assert.equal(docInput1Merged.value, 'Đoạn 1tiếp theo');
  assert.equal(document.activeElement, docInput1Merged);
  assert.equal(docInput1Merged.selectionStart, 'Đoạn 1'.length);

  // 2. Quick Note: verify empty line Backspace, start-of-line merge Backspace, and empty first bullet exit + delete up.
  await click(document.querySelector('aside button[aria-label="Quick Note"]'));
  const dialog = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
  await click(dialog.querySelector('button[aria-label="Quay lại ghi chú gần đây"]'));
  await click(dialog.querySelector('[data-quick-note-item="qn-backspace"]'));

  // 2a. Empty single bullet item -> 1st Backspace exits bullet to paragraph; 2nd Backspace moves up onto end of "hehe".
  const qBulletInput = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-4"] textarea')!;
  await act(async () => {
    qBulletInput.focus();
    qBulletInput.setSelectionRange(0, 0);
    qBulletInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  assert.equal(dialog.querySelector('[data-block-id="bs-q-4"] [data-list-kind]'), null, 'First Backspace on empty bullet must exit list to paragraph');
  const qExitedParaInput = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-4"] textarea')!;
  assert.equal(document.activeElement, qExitedParaInput);
  await act(async () => {
    qExitedParaInput.setSelectionRange(0, 0);
    qExitedParaInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  assert.equal(dialog.querySelector('[data-block-id="bs-q-4"]'), null);
  const q3AfterBulletExit = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-3"] textarea')!;
  assert.equal(document.activeElement, q3AfterBulletExit);
  assert.equal(q3AfterBulletExit.selectionStart, 'hehe'.length);

  // 2b. Empty line bs-q-2 -> Backspace deletes it and places caret at END of "hahah".
  const qEmptyInput = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-2"] textarea')!;
  await act(async () => {
    qEmptyInput.focus();
    qEmptyInput.setSelectionRange(0, 0);
    qEmptyInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  assert.equal(dialog.querySelector('[data-block-id="bs-q-2"]'), null);
  const q1AfterEmpty = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-1"] textarea')!;
  assert.equal(document.activeElement, q1AfterEmpty);
  assert.equal(q1AfterEmpty.selectionStart, 'hahah'.length);
  assert.equal(q1AfterEmpty.selectionEnd, 'hahah'.length);

  // 2c. Start-of-line Backspace on bs-q-3 ("hehe") merges it onto "hahah" with caret at offset 5.
  const q3Input = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-3"] textarea')!;
  await act(async () => {
    q3Input.focus();
    q3Input.setSelectionRange(0, 0);
    q3Input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  });
  assert.equal(dialog.querySelector('[data-block-id="bs-q-3"]'), null);
  const q1Merged = dialog.querySelector<HTMLTextAreaElement>('[data-block-id="bs-q-1"] textarea')!;
  assert.equal(q1Merged.value, 'hahahhehe');
  assert.equal(document.activeElement, q1Merged);
  assert.equal(q1Merged.selectionStart, 'hahah'.length);
});

test('SlashMenu flips upward or clamps height near bottom edge without clipping or overlapping active line', async () => {
  const { saveStoredDocuments } = await import('../utils/storage');
  const base = getStoredDocuments().find((doc) => !doc.isTrash && doc.space === 'personal')!;
  saveStoredDocuments([
    {
      ...base,
      id: 'slash-bottom-doc',
      title: 'Kiểm tra SlashMenu cuối trang',
      blocks: [
        { id: 'sb-1', type: 'paragraph', content: 'Nội dung phía trên' },
        { id: 'sb-bottom', type: 'paragraph', content: '' },
      ],
    },
  ]);

  await mount('/documents/slash-bottom-doc');
  const vh = window.innerHeight;
  const bottomInput = document.querySelector<HTMLTextAreaElement>('#document-editor-container [data-block-id="sb-bottom"] textarea')!;

  const triggerSlashAtRect = async (topPx: number, bottomPx: number, value: string) => {
    Object.defineProperty(bottomInput, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: topPx, bottom: bottomPx, left: 280, right: 680, width: 400, height: bottomPx - topPx, x: 280, y: topPx, toJSON: () => ({}) }),
    });
    await act(async () => {
      bottomInput.focus();
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(bottomInput, value);
      bottomInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    return document.querySelector<HTMLElement>('[role="dialog"][aria-label="Chèn tiện ích nhanh"]')!;
  };

  // Case 1: "/" near very bottom (e.g. y=680..704 on 768px screen) -> flips strictly ABOVE active line and never clips below viewport.
  const bottomLineTop = Math.max(400, vh - 88);
  const bottomLineBottom = bottomLineTop + 24;
  const menuBottom = await triggerSlashAtRect(bottomLineTop, bottomLineBottom, '/');
  assert(menuBottom);
  const top1 = parseFloat(menuBottom.style.top);
  const maxH1 = parseFloat(menuBottom.style.maxHeight);
  assert(top1 >= 12, `Expected menu top (${top1}) >= 12`);
  assert(top1 + maxH1 <= bottomLineTop - 6, `Expected flipped menu bottom (${top1 + maxH1}) above line top (${bottomLineTop})`);
  assert(menuBottom.querySelector('[role="listbox"]')?.className.includes('flex-1'));
  assert(menuBottom.textContent?.includes('Đóng menu'));

  // Clear slash before Case 2
  await triggerSlashAtRect(bottomLineTop, bottomLineBottom, '');

  // Case 2: "/" in lower half (e.g. vh - 320) -> never exceeds vh - 12 and never overlaps line rect.
  const midBottomTop = Math.max(220, vh - 320);
  const midBottom = midBottomTop + 24;
  const menuMid = await triggerSlashAtRect(midBottomTop, midBottom, '/');
  assert(menuMid);
  const top2 = parseFloat(menuMid.style.top);
  const maxH2 = parseFloat(menuMid.style.maxHeight);
  assert(top2 >= 12);
  assert(top2 + maxH2 <= vh - 12, `Expected menu bottom (${top2 + maxH2}) inside viewport (${vh - 12})`);
  assert(
    top2 >= midBottom + 6 || top2 + maxH2 <= midBottomTop - 6,
    `Menu (${top2}..${top2 + maxH2}) must not overlap slash line (${midBottomTop}..${midBottom})`
  );
});

test('QuickActionMenu creates templates inside the currently active workspace tab in both Sidebar variants', async () => {
  for (const useNewSidebar of [false, true]) {
    layoutConfig.useSidebar2 = useNewSidebar;
    try {
      await mount('/private');

      // 1. In personal space ("Ghi chép của tôi"), even a company-default template ("Biên bản cuộc họp") must be created inside personal space at root.
      await click(document.querySelector('aside button[title="Thao tác nhanh khác"]'));
      const personalQuickMenu = document.querySelector('#quick-action-dialog')!;
      await click(button('Biên bản cuộc họp', personalQuickMenu));
      const personalDocId = decodeURIComponent(window.location.pathname.split('/').pop()!);
      const personalDoc = getStoredDocuments().find((d) => d.id === personalDocId)!;
      assert.equal(personalDoc.space, 'personal');
      assert.equal(personalDoc.isPrivate, true);
      assert.equal(personalDoc.folderId, null);

      // 2. Switch to company space ("Tài liệu công ty") -> even a personal-default template ("Kế hoạch tuần") must be created inside company space at root.
      if (useNewSidebar) {
        await click(document.querySelector('[aria-label="Không gian tài liệu"]'));
        await click(document.querySelector('[role="option"][data-space="company"]'));
      } else {
        await click(document.getElementById('space-tab-company'));
      }

      await click(document.querySelector('aside button[title="Thao tác nhanh khác"]'));
      const companyQuickMenu = document.querySelector('#quick-action-dialog')!;
      await click(button('Kế hoạch tuần', companyQuickMenu));
      const companyDocId = decodeURIComponent(window.location.pathname.split('/').pop()!);
      const companyDoc = getStoredDocuments().find((d) => d.id === companyDocId)!;
      assert.equal(companyDoc.space, 'company');
      assert.equal(companyDoc.isPrivate, false);
      assert.equal(companyDoc.folderId, null);
    } finally {
      layoutConfig.useSidebar2 = false;
    }
  }
});

test('print layout renders normal-flow text mirrors, reflows linked text, recalculates list heights on resize, and hides screen-only controls', async () => {
  await mount('/documents/doc_personal_production_meeting');

  // 1. Document title and unlinked list/paragraph items have print:hidden textarea + hidden print:block mirror without conflicting display:block on screen
  const titleSource = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Tiêu đề ghi chú"][data-print-source]')!;
  const titleMirror = titleSource.nextElementSibling as HTMLElement;
  assert(titleSource.classList.contains('print:hidden'));
  assert.equal(titleMirror.getAttribute('data-print-mirror'), '');
  assert(titleMirror.classList.contains('hidden'));
  assert(titleMirror.classList.contains('print:block'));
  assert.equal(titleMirror.textContent, 'Biên bản giao ban sản xuất');

  const unlinkedItem = document.querySelector<HTMLElement>('[data-list-item="odt_meeting_11_item_1"]')!;
  const unlinkedSource = unlinkedItem.querySelector<HTMLTextAreaElement>('textarea[data-print-source]')!;
  const unlinkedMirror = unlinkedItem.querySelector<HTMLElement>('[data-print-mirror]')!;
  assert(unlinkedSource.classList.contains('print:hidden'));
  assert(unlinkedMirror.classList.contains('hidden'));
  assert(unlinkedMirror.classList.contains('print:block'));
  assert(!unlinkedMirror.classList.contains('block'), 'Unlinked list print mirror must not keep conflicting block class alongside hidden');
  assert(unlinkedMirror.textContent?.includes('Vấn đề này rất nghiêm trọng'));

  // 2. Linked items hide textarea in print and reset overlay div from absolute to static so multi-line print text never overlaps adjacent rows
  const linkedItem = document.querySelector<HTMLElement>('[data-list-item="odt_meeting_08_item_2"]')!;
  const linkedSource = linkedItem.querySelector<HTMLTextAreaElement>('textarea[data-print-source]')!;
  const linkedOverlay = linkedItem.querySelector<HTMLElement>('[data-linked-text]')!;
  assert(linkedSource.classList.contains('print:hidden'));
  assert(linkedOverlay.classList.contains('print:static'));
  assert(linkedOverlay.classList.contains('print:inset-auto'));
  assert(linkedOverlay.classList.contains('print:h-auto'));
  assert.equal(linkedOverlay.querySelector('a')?.textContent, 'tại đây');

  // 3. ListBlock recalculates textarea heights when viewport/window resizes (e.g., width toggle / window resize)
  let currentHeight = 24;
  Object.defineProperty(linkedSource, 'scrollHeight', { configurable: true, get: () => currentHeight });
  await act(async () => {
    window.dispatchEvent(new window.Event('resize'));
  });
  assert.equal(linkedSource.style.height, '24px');
  currentHeight = 48;
  await act(async () => {
    window.dispatchEvent(new window.Event('resize'));
  });
  assert.equal(linkedSource.style.height, '48px', 'ListBlock must recalculate item height on width/viewport resize');

  // 4. Main top navbar (.main-header), floating '?' help button, bottom empty prompt, EmptyBlockRow, and block drag gutter are excluded from print
  const mainHeader = document.querySelector<HTMLElement>('.main-header')!;
  assert(mainHeader.classList.contains('no-print'), 'Main app header must carry no-print so it is not printed');
  const helpButton = document.querySelector<HTMLElement>('main button[title="Trợ giúp"]')!;
  assert(helpButton.closest('.no-print'), 'Floating ? help button must be hidden in print');
  const boldMirrorParent = document.querySelector<HTMLElement>('[data-block-id*="odt_meeting_01"] [data-print-mirror]')!.parentElement!;
  assert(boldMirrorParent.className.includes('[&_[data-print-mirror]]:[font-weight:inherit]'));
  const exitRow = document.querySelector<HTMLElement>('[data-list-exit-for]');
  assert(exitRow?.classList.contains('no-print'));
  const firstBlockRow = document.querySelector<HTMLElement>('[data-block-id]')!;
  assert(firstBlockRow.classList.contains('print:ml-0'));
  assert(firstBlockRow.querySelector('button[title="Thêm khối bên dưới"]')?.closest('.no-print'));
  const { saveStoredDocuments } = await import('../utils/storage');
  const baseDoc = getStoredDocuments().find((d) => !d.isTrash)!;
  saveStoredDocuments([{ ...baseDoc, id: 'print-hint-doc', blocks: [{ id: 'ph-1', type: 'paragraph', content: 'Đoạn kết' }] }]);
  await mount('/documents/print-hint-doc');
  const editorCanvas = document.querySelector<HTMLElement>('[data-content-width]')!;
  assert(!editorCanvas.textContent?.includes('Đã lưu'), 'Editor canvas must not render "Đã lưu" status strip');
  assert(!editorCanvas.textContent?.includes('Cập nhật '), 'Editor canvas must not render "Cập nhật ..." timestamp strip');
  const bottomPrompt = Array.from(document.querySelectorAll('span')).find((s) => s.textContent?.includes('Gõ nội dung hoặc gõ / để mở tiện ích...'))!;
  assert(bottomPrompt.closest('.no-print'));

  // 5. Global print stylesheet enforces [data-print-mirror], [data-print-source], [data-linked-text], and .main-header print rules
  const indexCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  assert(indexCss.includes('[data-print-mirror]'));
  assert(indexCss.includes('[data-print-source]'));
  assert(indexCss.includes('.main-header'));
  assert(indexCss.includes('position: static !important'));
});

test('Quick Note header title input selects all text on focus/click for immediate inline rename', async () => {
  const { getStoredQuickNotes } = await import('../utils/quickNotes');
  await mount('/private');
  await click(document.querySelector('aside button[aria-label="Quick Note"]'));
  const modal = document.querySelector<HTMLElement>('[data-quick-note-modal]')!;
  const bodyTextarea = modal.querySelector<HTMLTextAreaElement>('[data-block-id] textarea')!;
  const titleInput = modal.querySelector<HTMLInputElement>('input[aria-label="Tiêu đề ghi chú nhanh"]')!;
  assert(titleInput.classList.contains('select-text'));

  // 1. Untitled note with body content 'aaa': clicking/focusing title promotes 'aaa' and selects all text
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(bodyTextarea, 'aaa');
    bodyTextarea.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(titleInput.value, '');
  assert.equal(titleInput.getAttribute('placeholder'), 'aaa');

  let mouseUpEvent!: MouseEvent;
  await act(async () => {
    titleInput.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    titleInput.focus();
    mouseUpEvent = new window.MouseEvent('mouseup', { bubbles: true, cancelable: true });
    titleInput.dispatchEvent(mouseUpEvent);
  });
  assert.equal(mouseUpEvent.defaultPrevented, true, 'Initial click mouseup must not collapse select-all');
  assert.equal(titleInput.value, 'aaa');
  assert.equal(titleInput.selectionStart, 0);
  assert.equal(titleInput.selectionEnd, 'aaa'.length);

  // 2. Blurring without modifying keeps derived title dynamic (draft.title stays '')
  await act(async () => {
    titleInput.blur();
  });
  assert.equal(titleInput.value, '');

  // 3. Re-focus, rename to 'Tên ghi chú mới', blur, then click again -> selects full explicit title
  await act(async () => {
    titleInput.focus();
  });
  assert.equal(titleInput.selectionStart, 0);
  assert.equal(titleInput.selectionEnd, 'aaa'.length);

  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(titleInput, 'Tên ghi chú mới');
    titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => {
    titleInput.blur();
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  assert.equal(getStoredQuickNotes()[0]?.title, 'Tên ghi chú mới');

  await act(async () => {
    titleInput.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    titleInput.focus();
    mouseUpEvent = new window.MouseEvent('mouseup', { bubbles: true, cancelable: true });
    titleInput.dispatchEvent(mouseUpEvent);
  });
  assert.equal(titleInput.selectionStart, 0);
  assert.equal(titleInput.selectionEnd, 'Tên ghi chú mới'.length);

  // 4. Subsequent click while already focused allows normal caret placement without preventing mouseup default
  await act(async () => {
    titleInput.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    mouseUpEvent = new window.MouseEvent('mouseup', { bubbles: true, cancelable: true });
    titleInput.dispatchEvent(mouseUpEvent);
  });
  assert.equal(mouseUpEvent.defaultPrevented, false);
});



