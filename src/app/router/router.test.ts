import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ViewState } from '../../types';
import { BrowserNavigation, BrowserRouter } from './browserRouter';
import { documentUrl, pathForView, viewForLocation } from './routes';

const pages: [ViewState, string][] = [
  [{ type: 'space_root', space: 'personal' }, '/private'], [{ type: 'space_root', space: 'company' }, '/company'],
  [{ type: 'private' }, '/library/private'], [{ type: 'company' }, '/library/company'],
  [{ type: 'templates' }, '/templates'], [{ type: 'library' }, '/library/all'],
  [{ type: 'favorite' }, '/favorites'], [{ type: 'recent' }, '/recent'],
  [{ type: 'unclassified' }, '/unclassified'],
  [{ type: 'unclassified', space: 'personal' }, '/library/private/unclassified'],
  [{ type: 'unclassified', space: 'company' }, '/library/company/unclassified'],
  [{ type: 'trash' }, '/trash'], [{ type: 'meeting_notes' }, '/library/meetings'],
  [{ type: 'shared' }, '/library/shared'],
  [{ type: 'document', documentId: 'doc_01' }, '/documents/doc_01'],
  [{ type: 'folder', folderId: 'fld_01' }, '/folders/fld_01'],
];

// EventTarget + URL-backed History adapter exercises the exact production router.
class TestBrowser extends EventTarget {
  entries: URL[];
  index = 0;
  constructor(path: string) { super(); this.entries = [new URL(path, 'http://localhost:3000')]; }
  get location() { return this.entries[this.index]; }
  history = {
    pushState: (_data: unknown, _unused: string, path: string) => {
      this.entries.splice(this.index + 1);
      this.entries.push(new URL(path, this.location)); this.index++;
    },
    replaceState: (_data: unknown, _unused: string, path: string) => {
      this.entries[this.index] = new URL(path, this.location);
    },
    back: () => { if (this.index > 0) { this.index--; this.dispatchEvent(new Event('popstate')); } },
    forward: () => { if (this.index < this.entries.length - 1) { this.index++; this.dispatchEvent(new Event('popstate')); } },
  };
  router() { return new BrowserRouter(this as unknown as BrowserNavigation); }
}

test('every page and dynamic ID round-trips through its own URL', () => {
  for (const [view, path] of pages) {
    assert.equal(pathForView(view), path);
    assert.deepEqual(viewForLocation(path), view);
    assert.deepEqual(viewForLocation(path + '/?source=test'), view);
  }
  for (const id of ['ghi chú hôm nay', 'abc/def?ghi#j', '%bad encoding']) {
    const view: ViewState = { type: 'document', documentId: id };
    assert.deepEqual(viewForLocation(pathForView(view)), view);
  }
});

test('direct navigation and reload preserve each requested page', () => {
  for (const [view, path] of pages) {
    const tab = new TestBrowser(path); const router = tab.router(); router.canonicalize();
    assert.deepEqual(viewForLocation(router.getSnapshot()), view);
    const reloaded = new TestBrowser(tab.location.href).router();
    assert.deepEqual(viewForLocation(reloaded.getSnapshot()), view);
    assert.equal(tab.entries.length, 1);
  }
});

test('click navigation, Back, Forward and duplicate clicks keep URL and page synchronized', () => {
  const tab = new TestBrowser('/library/private'); const router = tab.router();
  const visited: string[] = []; const unsubscribe = router.subscribe(() => visited.push(router.getSnapshot()));
  router.navigate({ type: 'templates' });
  router.navigate({ type: 'company' });
  router.navigate({ type: 'company' });
  assert.equal(tab.entries.length, 3);
  tab.history.back(); assert.deepEqual(viewForLocation(router.getSnapshot()), { type: 'templates' });
  tab.history.back(); assert.deepEqual(viewForLocation(router.getSnapshot()), { type: 'private' });
  tab.history.forward(); assert.deepEqual(viewForLocation(router.getSnapshot()), { type: 'templates' });
  router.navigate({ type: 'trash' });
  assert.equal(tab.entries.length, 3); // Forward history is discarded after branching.
  assert.deepEqual(visited, ['/templates', '/library/company', '/templates', '/library/private', '/templates', '/trash']);
  unsubscribe(); tab.history.back(); assert.equal(visited.length, 6);
});

test('home, old shared links and aliases use replaceState instead of extra history', () => {
  for (const [old, path] of [['/library', '/library/all'], ['/private', '/private'], ['/company', '/company'], ['/shared', '/library/shared'], ['/meetings', '/library/meetings']]) {
    const tab = new TestBrowser(old); const router = tab.router(); router.canonicalize();
    assert.equal(router.getSnapshot(), path);
    assert.equal(tab.entries.length, 1);
  }
  for (const [old, path] of [['/', '/library/private'], ['/Notes/', '/library/private'], ['/templates/', '/templates'],
    ['/#doc=doc_old', '/documents/doc_old'], ['/recent/', '/recent']]) {
    const tab = new TestBrowser(old); const router = tab.router(); router.canonicalize();
    assert.equal(router.getSnapshot(), path); assert.equal(tab.entries.length, 1);
  }
  assert.equal(documentUrl('https://notes.example', 'doc_a/b'), 'https://notes.example/documents/doc_a%2Fb');
});

test('invalid paths and malformed encodings show not-found without hiding the address', () => {
  for (const path of ['/unknown', '/library/private/missing', '/documents', '/folders/%E0%A4%A']) {
    const tab = new TestBrowser(path); const router = tab.router(); router.canonicalize();
    assert.equal(viewForLocation(router.getSnapshot()).type, 'not_found');
    assert.equal(router.getSnapshot(), path);
  }
});
