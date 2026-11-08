import React, { ComponentProps } from 'react';
import { BlockEditor } from '../../components/editor/BlockEditor';
import { Document } from '../../types';
import { NotFoundPage } from './NotFoundPage';

export function DocumentPage({ documentId, documents, editor, onGoHome }: {
  documentId: string; documents: Document[];
  editor: Omit<ComponentProps<typeof BlockEditor>, 'document'>;
  onGoHome: () => void;
}) {
  const document = documents.find(doc => doc.id === documentId && !doc.isTrash);
  if (!document) return <NotFoundPage title="Tài liệu không khả dụng" onGoHome={onGoHome} />;
  return <BlockEditor key={document.id} {...editor} document={document} />;
}
