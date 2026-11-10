import React from 'react';
import { DocumentPageProps } from './pageTypes';
import { DocumentListPage } from './DocumentListPage';
import { SpaceType } from '../../types';

export function UnclassifiedPage({ documents, actions, space }: DocumentPageProps & { space?: SpaceType }) {
  const unclassified = documents.filter(doc => !doc.isTrash && !doc.folderId && (!space || doc.space === space))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return <DocumentListPage title="Chưa phân loại" description={space ? `${space === 'personal' ? 'Tài liệu của tôi' : 'Tài liệu công ty'} / Chưa phân loại` : 'Ghi chú chưa được đưa vào thư mục.'}
    documents={unclassified} onOpenDocument={actions.onOpenDocument} />;
}
