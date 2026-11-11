import React from 'react';
import { Document } from '../../types';
import { ShareDialog } from './ShareDialog';

export function DocumentLinkShare({ document, onClose }: { document: Document; onClose: () => void }) {
  return <ShareDialog key={document.id} document={document} onClose={onClose} />;
}
