import React, { ComponentProps } from 'react';
import { ViewState } from '../types';
import { BlockEditor } from '../components/editor/BlockEditor';
import { DocumentPageProps } from './pages/pageTypes';
import { PrivatePage } from './pages/PrivatePage';
import { CompanyPage } from './pages/CompanyPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { LibraryPage } from './pages/LibraryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { UnclassifiedPage } from './pages/UnclassifiedPage';
import { RecentPage } from './pages/RecentPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { SharedPage } from './pages/SharedPage';
import { FolderPage } from './pages/FolderPage';
import { DocumentPage } from './pages/DocumentPage';
import { TrashPage } from './pages/TrashPage';
import { NotFoundPage } from './pages/NotFoundPage';

export interface AppPagesProps extends DocumentPageProps {
  view: ViewState;
  onNavigate: (view: ViewState) => void;
  onUseTemplate: (id: string) => void;
  editor: Omit<ComponentProps<typeof BlockEditor>, 'document'>;
  trash: Omit<ComponentProps<typeof TrashPage>, 'documents'>;
}

export function AppPages({ view, onNavigate, onUseTemplate, editor, trash, ...workspace }: AppPagesProps) {
  switch (view.type) {
    case 'space_root': return <FolderPage key={view.space} {...workspace} folderId={''} rootSpace={view.space} onNavigate={onNavigate} />;
    case 'private': return <PrivatePage {...workspace} />;
    case 'company': return <CompanyPage {...workspace} />;
    case 'templates': return <TemplatesPage onUseTemplate={onUseTemplate} />;
    case 'library': return <LibraryPage {...workspace} />;
    case 'favorite': return <FavoritesPage {...workspace} onNavigate={onNavigate} />;
    case 'recent': return <RecentPage {...workspace} />;
    case 'unclassified': return <UnclassifiedPage {...workspace} space={view.space} />;
    case 'meeting_notes': return <MeetingsPage {...workspace} />;
    case 'shared': return <SharedPage {...workspace} />;
    case 'folder': return <FolderPage key={view.folderId} {...workspace} folderId={view.folderId} onNavigate={onNavigate} />;
    case 'document': return <DocumentPage {...workspace} documentId={view.documentId} editor={editor} onGoHome={() => onNavigate({ type: 'private' })} />;
    case 'trash': return <TrashPage {...trash} folders={workspace.folders} documents={workspace.documents} />;
    case 'not_found': return <NotFoundPage onGoHome={() => onNavigate({ type: 'private' })} />;
  }
}
