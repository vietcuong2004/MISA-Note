import React from 'react';
import { DocumentPageProps } from './pageTypes';
import { DocumentListPage } from './DocumentListPage';

export function RecentPage({ documents, actions }: DocumentPageProps) {
  const recent = documents.filter(doc => !doc.isTrash)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return <DocumentListPage title="Gần đây" description="Tài liệu được cập nhật gần nhất."
    emptyMessage="Chưa có tài liệu gần đây." documents={recent} onOpenDocument={actions.onOpenDocument} />;
}
