import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function CompanyPage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions} title="Tài liệu công ty" description="Ghi chú, biên bản và tài liệu dùng chung của công ty."
    documents={documents.filter(doc => doc.space === 'company')} folders={folders.filter(folder => folder.space === 'company')}
    showTabs={true} activeTab="company" defaultSpace="company" />;
}
