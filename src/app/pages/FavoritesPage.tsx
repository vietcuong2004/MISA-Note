import React from 'react';
import { DocumentPageProps } from './pageTypes';
import { DocumentListPage } from './DocumentListPage';

export function FavoritesPage({ documents, actions }: DocumentPageProps) {
  return <DocumentListPage title="Yêu thích" description="Các tài liệu quan trọng đã được gắn dấu sao" favorite
    documents={documents.filter(doc => doc.isFavorite && !doc.isTrash)} onOpenDocument={actions.onOpenDocument} />;
}
