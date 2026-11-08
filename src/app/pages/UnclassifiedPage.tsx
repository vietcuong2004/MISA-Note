import React from 'react';
import { DocumentPageProps } from './pageTypes';
import { DocumentListPage } from './DocumentListPage';

export function UnclassifiedPage({ documents, actions }: DocumentPageProps) {
  const unclassified = documents.filter(doc => !doc.isTrash && !doc.folderId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return <DocumentListPage title="Chưa phân loại" description="Ghi chú chưa được đưa vào thư mục."
    documents={unclassified} onOpenDocument={actions.onOpenDocument} />;
}
