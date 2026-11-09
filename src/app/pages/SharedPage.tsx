import React from 'react';
import { LibraryView } from '../../components/views/LibraryView';
import { DocumentPageProps } from './pageTypes';

export function SharedPage({ documents, folders, actions }: DocumentPageProps) {
  return <LibraryView {...actions} title="Được chia sẻ" description="Tài liệu công ty và ghi chú được chia sẻ với bạn."
    documents={documents.filter(doc => doc.space === 'company' || doc.tags.includes('Được chia sẻ'))}
    folders={folders} showTabs={true} activeTab="shared" />;
}
