
export type SearchMode = 'agency' | 'web' | 'realestate' | 'people' | 'onedrive' | 'contacts';

export interface Portal {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
  custom?: boolean;
  image?: string;
  color?: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export interface HistoryItem {
  id: string;
  link: string;
  deletehash?: string; // legacy Imgur uploads
  key?: string; // BLI Image Host object key
  name: string;
  createdAt: number;
  groups: string[];
  base64?: string; // Store base64 for AI editing
}

