import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function MeetingsPage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions} title="Ghi chú cuộc họp" description="Biên bản và ghi chú các cuộc họp."
    documents={documents.filter(doc => doc.type === 'meeting')} folders={folders} showTabs={false} defaultSpace="company" />;
}
