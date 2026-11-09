import React, { act } from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { FolderTree } from './FolderTree';
import { clearActiveDrag, getActiveDrag, setActiveDrag } from '../../utils/dnd';
import { INITIAL_FOLDERS } from '../../data/mockData';
import { FolderPage } from '../../app/pages/FolderPage';

test('folder drops move to the target and blocked drops never bubble to the space root', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  for (const key of ['window', 'document', 'navigator', 'Node', 'HTMLElement']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
  }
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(document.getElementById('root')!);
  const folders = [
    { ...INITIAL_FOLDERS[0], id: 'source', parentId: null },
    { ...INITIAL_FOLDERS[0], id: 'child', parentId: 'source' },
    { ...INITIAL_FOLDERS[0], id: 'target', parentId: null },
  ];
  const moves: string[][] = [];
  let rootDrops = 0;
  const noop = () => {};
  try {
    await act(async () => root.render(
      <div onDrop={() => rootDrops++}>
        <FolderTree folders={folders} documents={[]} space={folders[0].space}
          view={{ type: 'private' }} expanded={{ source: true, child: true }}
          dragOverFolderId={null} newFolderId={null} draggingDocumentId={null}
          onToggle={noop} onNavigate={noop} onCreateFolder={noop} onFinishNewFolder={noop}
          onRenameNewFolder={noop} onEditFolder={noop} onDeleteFolder={noop}
          onDragOverFolder={noop} onDropDocument={noop} renderDocument={() => null}
          onDropFolder={(target, source) => moves.push([source, target.id])} />
      </div>
    ));
    for (const [target, emptyArea] of [['source', false], ['child', false], ['child', true], ['target', false]] as const) {
      await act(async () => setActiveDrag({ type: 'folder', id: 'source' }));
      const branch = document.querySelector(`[data-folder-id="${target}"]`)!;
      const dropTarget = emptyArea
        ? branch.querySelector('div.italic')!
        : branch.firstElementChild!;
      // Browsers can hide transfer data; the active drag must remain available until read.
      const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true });
      await act(async () => { dropTarget.dispatchEvent(drop); });
      assert.equal(drop.defaultPrevented, true);
      assert.equal(rootDrops, 0);
      assert.equal(getActiveDrag(), null);
    }
    assert.deepEqual(moves, [['source', 'target']]);

    const pageMoves: unknown[][] = [];
    await act(async () => root.render(
      <FolderPage folderId="source" folders={folders} documents={[]} onNavigate={noop}
        actions={{ onOpenDocument: noop, onToggleFavorite: noop, onSoftDeleteDocument: noop,
          onMoveFolder: (...args) => { pageMoves.push(args); } }} />
    ));
    await act(async () => setActiveDrag({ type: 'folder', id: 'child' }));
    const rootTarget = document.querySelector('section button')!;
    await act(async () => { rootTarget.dispatchEvent(new dom.window.Event('drop', { bubbles: true, cancelable: true })); });
    assert.deepEqual(pageMoves, [['child', null, folders[0].space]]);
    assert.equal(getActiveDrag(), null);
  } finally {
    await act(async () => { clearActiveDrag(); root.unmount(); });
    dom.window.close();
  }
});
