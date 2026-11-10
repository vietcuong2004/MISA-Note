import React from 'react';
import { Block, BlockProperties } from '../../types';
import { AttachmentBlock } from './AttachmentBlock';

export function AudioBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  return <AttachmentBlock block={block} readOnly={readOnly} onChange={onChange} />;
}
