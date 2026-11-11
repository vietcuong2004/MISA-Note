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
      for (const label of ['Của tôi', 'Công ty', 'Được chia sẻ', 'Cuộc họp', 'Tất cả']) {
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
    assert.equal(sidebar.style.width, '280px');
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
    const createButton = sidebar.querySelector<HTMLButtonElement>('button[title="Tạo mới"]')!;
    const aiButton = sidebar.querySelector<HTMLButtonElement>('button[title="Hỏi AI"]')!;
    assert.equal(headerRow.children[0], select.parentElement);
    const actionRow = createButton.parentElement!.parentElement!;
    assert.notEqual(actionRow, headerRow);
    assert(actionRow.className.includes('mt-2'));
    assert(actionRow.className.includes('gap-1.5'));
    assert(createButton.parentElement!.className.includes('flex-1'));
    assert(aiButton.parentElement!.className.includes('flex-1'));
    assert(createButton.className.includes('w-full'));
    assert(aiButton.className.includes('w-full'));
    assert(createButton.className.includes('px-3'));
    assert(aiButton.className.includes('px-3'));
    assert.equal(actionRow.children[0], createButton.parentElement);
    assert.equal(actionRow.children[1], aiButton.parentElement);
    assert.equal(actionRow.lastElementChild?.getAttribute('title'), 'Thao tác nhanh khác');
    assert(actionRow.lastElementChild?.className.includes('w-9'));
    const resize = async (from: number, to: number) => {
      const handle = sidebar.querySelector('[title^="Kéo sang trái/phải"]')!;
      await act(async () => handle.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, clientX: from })));
      await act(async () => document.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: to })));
      await act(async () => document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true })));
    };
    await resize(280, 500);
    assert.equal(createButton.querySelector('span')?.classList.contains('sr-only'), false);
    assert.equal(aiButton.querySelector('span')?.classList.contains('sr-only'), false);
    await resize(500, 200);
    assert.equal(createButton.querySelector('span')?.classList.contains('sr-only'), true);
    assert.equal(aiButton.querySelector('span')?.classList.contains('sr-only'), true);
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
  const doc = getStoredDocuments().find(item => !item.isTrash)!;
  await mount(`/documents/${doc.id}`);
  const toggle = document.querySelector<HTMLButtonElement>('button[aria-label="Xem toàn màn hình"]')!;
  const content = document.querySelector<HTMLElement>('[data-content-width]')!;
  const initialText = document.querySelector<HTMLTextAreaElement>('#document-editor-container textarea')?.value;
  assert.equal(toggle.textContent, 'Vừa đọc');
  assert(content.firstElementChild?.classList.contains('max-w-2xl'));
  assert(content.firstElementChild?.classList.contains('mx-auto'));
  await click(toggle);
  assert.equal(toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(toggle.textContent, 'Xem toàn màn hình');
  assert(content.classList.contains('px-[5%]'));
  assert(!content.firstElementChild?.classList.contains('max-w-2xl'));
  assert.equal(document.querySelector<HTMLTextAreaElement>('#document-editor-container textarea')?.value, initialText);
  await click(toggle);
  assert.equal(toggle.textContent, 'Vừa đọc');
  assert(content.firstElementChild?.classList.contains('max-w-2xl'));
  assert(content.firstElementChild?.classList.contains('mx-auto'));
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
    await click(document.querySelector('button[title="Video"]'));
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
    await click(document.querySelector('button[title="Tệp"]'));
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
  await click(document.querySelector('button[title="Hình ảnh"]'));
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
  const suggested = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Được đề xuất"] [role="option"]')).map(item => item.title);
  await open();
  assert.deepEqual(suggested(), []);
  await click(document.querySelector('button[title="Ghi chép cuộc họp với AI"]'));
  assert.deepEqual(suggested(), []);
  for (const title of ['Văn bản', 'Đề mục 1', 'Đề mục 2', 'Đề mục 3', 'Đề mục 4', 'Chữ màu đỏ']) {
    if (!document.querySelector('[aria-label="Chèn tiện ích nhanh"]')) await open();
    await click(document.querySelector(`button[title="${title}"]`));
  }
  await open();
  assert.deepEqual(suggested(), ['Chữ màu đỏ', 'Đề mục 4', 'Đề mục 3', 'Đề mục 2', 'Đề mục 1']);
  const options = Array.from(document.querySelectorAll('[role="option"]'));
  assert.equal(new Set(options.map(option => option.id)).size, options.length);
  await click(document.querySelector('[aria-label="Được đề xuất"] button[title="Đề mục 2"]'));
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
  await click(document.querySelector('button[title="Danh sách gạch đầu dòng"]'));
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
  assert.equal(selected()?.title, 'Hình ảnh');
  const first = selected()!.id;
  await key('ArrowDown');
  assert.notEqual(selected()?.id, first);
  assert.equal(document.activeElement, input);
  await key('ArrowUp');
  assert.equal(selected()?.id, first);
  await type('/de muc');
  assert.equal(document.querySelectorAll('[aria-label="Tiện ích nhanh"] [role="option"]').length, 4);
  assert.equal(selected()?.title, 'Đề mục 1');
  await key('ArrowDown');
  assert.equal(selected()?.title, 'Đề mục 2');
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
  const yellowSwatch = document.querySelector<HTMLSpanElement>('button[title="Nền vàng"] span[aria-hidden="true"]')!;
  assert.equal(yellowSwatch.style.backgroundColor, 'rgb(252, 225, 129)');
  assert.equal(yellowSwatch.style.borderColor, 'rgb(203, 145, 47)');
  const defaultSwatch = document.querySelector<HTMLSpanElement>('button[title="Nền mặc định"] span[aria-hidden="true"]')!;
  assert.equal(defaultSwatch.style.backgroundColor, 'transparent');
  await click(document.querySelector('button[title="Chữ màu đỏ"]'));
  await type('/nen xanh lam');
  await click(document.querySelector('button[title="Nền xanh lam"]'));
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
  await click(document.querySelector('button[title="Chữ mặc định"]'));
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
  const ai = document.querySelector('button[title="Ghi chép cuộc họp với AI"]') as HTMLButtonElement;
  assert(ai.disabled);
  assert(ai.textContent?.includes('Đang phát triển'));
  await click(ai);
  await act(async () => { textarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
  assert(document.querySelector('[aria-label="Chèn tiện ích nhanh"]'));
  await type('/');
  assert.equal(document.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('title'), 'Văn bản');
  await act(async () => { textarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })); });
  assert.equal(document.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('title'), 'Nền đỏ');
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
  await click(document.querySelector('button[title="Nhắc đến 1 người"]'));
  let dialog = document.querySelector('[aria-label="Mời và phân quyền"]')!;
  assert(dialog);
  assert(!dialog.textContent?.includes('Các mức quyền'));
  assert.equal(dialog.querySelector('[aria-label="Danh sách nhân viên"]'), null);
  await click(dialog.querySelector('[aria-label="Danh bạ"]'));
  assert(dialog.querySelector('[aria-label="Danh sách nhân viên"] [role="option"]'));
  await click(dialog.querySelector('[aria-label="Đóng danh sách nhân viên"]'));
  await click(button('Gửi lời mời (0)', dialog));
  assert(dialog.querySelector('[role="alert"]'));
  const add = async (query: string) => {
    await fill(dialog.querySelector<HTMLInputElement>('input[aria-label="Tìm nhân viên"]')!, query);
    await click(dialog.querySelector('[aria-label="Danh sách nhân viên"] [role="option"]'));
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
  await click(document.querySelector('button[title="Nhắc đến 1 nhóm"]'));
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
  await click(document.querySelector('button[title="Việt Cường"]'));
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
  assert.equal(dialog.querySelector('input')?.value, expected);
  await click(button('Sao chép liên kết', dialog));
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
  await click(button('Sao chép liên kết', dialog));
  assert(dialog.textContent?.includes('Nhấn Ctrl+C'));
  assert(!button('Đã sao chép', dialog));
  const input = dialog.querySelector('input')!;
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

test('all library navigation tabs, sidebar lists and folder names have working routes', async () => {
  for (const [label, path] of [['Của tôi', '/library/private'], ['Công ty', '/library/company'], ['Được chia sẻ', '/library/shared'], ['Cuộc họp', '/library/meetings'], ['Mẫu', '/templates']]) {
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
  for (const [label, path] of [['Gần đây', '/recent'], ['Yêu thích', '/favorites']]) {
    await click(Array.from(document.querySelectorAll('aside span')).find(element => element.textContent === label));
    assert.equal(window.location.pathname, path); assert.equal(heading(), label);
  }
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
  await click(button('Tạo thư mục', document.querySelector('aside')!));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert(getStoredFolders().some(folder => folder.name === 'Thư mục mới' && folder.parentId === 'fld_work'));
  await nameNewFolder('Sprint A');
  const child = getStoredFolders().find(folder => folder.name === 'Sprint A')!;
  assert.equal(child.parentId, 'fld_work'); assert.equal(child.space, 'personal');
  assert.equal(getStoredDocuments().length, initialNoteCount);
  assert(document.querySelector(`[data-folder-id="fld_work"] [data-folder-id="${child.id}"]`));
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Sprint A"]'));
  await click(button('Tạo thư mục', document.querySelector('aside')!));
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
  await click(button('Tạo thư mục', document.querySelector('aside')!));
  const firstInput = document.querySelector('input[aria-label="Tên thư mục mới"]') as HTMLInputElement;
  assert.equal(firstInput, document.activeElement);
  assert.equal(firstInput.value, 'Thư mục mới');
  await act(async () => { firstInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert(getStoredFolders().some(folder => folder.parentId === 'fld_work' && folder.name === 'Thư mục mới'));
  await click(document.querySelector('button[aria-label="Tạo thư mục con trong Công việc"]'));
  await click(button('Tạo thư mục', document.querySelector('aside')!));
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
  const recentRow = Array.from(document.querySelectorAll('aside span')).find(el => el.textContent === 'Gần đây')!;
  assert(recentRow);
  await click(recentRow);
  assert.equal(window.location.pathname, '/recent');
  assert.equal(heading(), 'Gần đây');
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
  assert.notEqual(document.activeElement, document.querySelector('textarea[placeholder="Tiêu đề trang..."]'));

  await click(document.querySelector('aside button[title="Tạo mới"]'));
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
  await click(document.querySelector('button[title="Khung chú thích"]'));

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
        await click(btn);
        assert.equal(window.location.pathname, path);
      }
    } finally { layoutConfig.useSidebar2 = false; }
  }
});

