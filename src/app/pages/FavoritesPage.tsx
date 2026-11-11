import React from 'react';
import { ViewState } from '../../types';
import { DocumentPageProps } from './pageTypes';
import { FolderPage } from './FolderPage';

export function FavoritesPage({ onNavigate, ...workspace }: DocumentPageProps & { onNavigate: (view: ViewState) => void }) {
  return <FolderPage {...workspace} folderId="" rootSpace="personal" favoritesOnly onNavigate={onNavigate} />;
}
