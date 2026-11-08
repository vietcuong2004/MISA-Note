import { Document, Folder } from '../../types';
import { LibraryViewProps } from '../../components/views/LibraryView';

export type DocumentActions = Omit<LibraryViewProps,
  'documents' | 'folders' | 'title' | 'description' | 'showTabs' | 'defaultSpace' | 'defaultFolderId'>;

export interface DocumentPageProps {
  documents: Document[];
  folders: Folder[];
  actions: DocumentActions;
}
