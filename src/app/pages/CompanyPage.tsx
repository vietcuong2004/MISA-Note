import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function CompanyPage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions}
    documents={documents.filter(doc => doc.space === 'company')} folders={folders.filter(folder => folder.space === 'company')}
    showTabs={true} activeTab="company" defaultSpace="company" />;
}
