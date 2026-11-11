import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function MeetingsPage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions}
    documents={documents} folders={folders} showTabs={true} activeTab="meeting" />;
}
