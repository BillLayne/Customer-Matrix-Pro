export type SearchMode = 'agency' | 'web' | 'realestate' | 'people' | 'onedrive';

export interface Portal {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
  custom?: boolean;
}

export interface Favorite {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export interface CustomContext {
  id: string;
  name: string;
  text: string;
}
