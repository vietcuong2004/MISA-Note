import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function PrivatePage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions}
    documents={documents.filter(doc => doc.space === 'personal')} folders={folders.filter(folder => folder.space === 'personal')}
    showTabs={true} activeTab="mine" defaultSpace="personal" />;
}
