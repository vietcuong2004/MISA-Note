import React from 'react';
import { Document, UserRole } from '../../types';
import { ShareDialog } from './ShareDialog';

interface ShareModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePermission: (role: UserRole, isPrivate: boolean) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function ShareModal({ document, isOpen, onClose, onUpdatePermission, onToast }: ShareModalProps) {
  if (!isOpen) return null;
  return <ShareDialog key={document.id} document={document} onClose={onClose} onSave={settings => {
    onUpdatePermission(document.permission, settings.general === 'restricted');
    onToast('Đã lưu thiết lập chia sẻ trong phiên làm việc', 'success');
  }} />;
}
