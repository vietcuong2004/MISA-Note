import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function PrivatePage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions} title="Ghi chú của tôi" description="Ghi chú và tài liệu trong khu vực của bạn."
    documents={documents.filter(doc => doc.space === 'personal')} folders={folders.filter(folder => folder.space === 'personal')}
    showTabs={false} defaultSpace="personal" />;
}
