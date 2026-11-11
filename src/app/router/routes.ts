import { ViewState } from '../../types';

const pagePaths = {
  private: '/library/private', company: '/library/company', templates: '/templates',
  recent: '/recent', favorite: '/favorites', library: '/library/all',
  trash: '/trash', meeting_notes: '/library/recents', shared: '/library/shared',
} as const;

export function pathForView(view: ViewState): string {
  switch (view.type) {
    case 'space_root': return view.space === 'personal' ? '/private' : '/company';
    case 'unclassified': return view.space ? `/library/${view.space === 'personal' ? 'private' : 'company'}/unclassified` : '/unclassified';
    case 'document': return `/documents/${encodeURIComponent(view.documentId)}`;
    case 'folder': return `/folders/${encodeURIComponent(view.folderId)}`;
    case 'not_found': return view.path.startsWith('/') && !view.path.startsWith('//') ? view.path : '/404';
    default: return pagePaths[view.type];
  }
}

/** Resolve both new page URLs and links shared by earlier app versions. */
export function viewForLocation(location: string): ViewState {
  const url = new URL(location, 'http://app.local');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const legacyDocument = new URLSearchParams(url.hash.slice(1)).get('doc');
  if ((path === '/' || path === '/Notes') && legacyDocument) return { type: 'document', documentId: legacyDocument };
  if (path === '/' || path === '/Notes') return { type: 'space_root', space: 'personal' };
  const aliases: Record<string, ViewState> = {
    '/library': { type: 'library' }, '/private': { type: 'space_root', space: 'personal' }, '/company': { type: 'space_root', space: 'company' },
    '/library/meetings': { type: 'meeting_notes' }, '/libary/recents': { type: 'meeting_notes' },
    '/shared': { type: 'shared' }, '/meetings': { type: 'meeting_notes' },
  };
  if (aliases[path]) return aliases[path];
  if (path === '/recent') return { type: 'recent' };
  if (path === '/unclassified') return { type: 'unclassified' };
  if (path === '/private/unclassified' || path === '/library/private/unclassified') return { type: 'unclassified', space: 'personal' };
  if (path === '/company/unclassified' || path === '/library/company/unclassified') return { type: 'unclassified', space: 'company' };
  for (const [type, pagePath] of Object.entries(pagePaths)) {
    if (pagePath === path) return { type } as ViewState;
  }
  const match = path.match(/^\/(documents|folders)\/([^/]+)$/);
  if (match) {
    try {
      const id = decodeURIComponent(match[2]);
      if (id) return match[1] === 'documents' ? { type: 'document', documentId: id } : { type: 'folder', folderId: id };
    } catch { /* Invalid URL encoding belongs on the not-found page. */ }
  }
  return { type: 'not_found', path: url.pathname };
}

export const documentUrl = (origin: string, documentId: string) =>
  `${origin}${pathForView({ type: 'document', documentId })}`;
