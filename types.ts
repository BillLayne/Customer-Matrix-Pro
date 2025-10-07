export type SearchMode = 'agency' | 'web' | 'realestate' | 'people' | 'onedrive';

export interface Portal {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
  custom?: boolean;
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

// FIX: Add and export the Favorite type.
export interface Favorite {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface Communication {
  id: string;
  type: 'call' | 'email' | 'note';
  text: string;
  timestamp: number;
}

export interface Task {
  id: string;
  text: string; // This will act as the main title of the task
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: number;

  // Detailed Task Fields
  customerName?: string;
  phone?: string;
  email?: string;
  customerValue?: number; // Premium
  taskType?: string; // e.g., 'Policy Change', 'New Quote', 'Follow-up'
  followUpDate?: string | null;
  carrier?: string;
  policyNumber?: string;
  description?: string; // More detailed description
  internalNotes?: string;
  isRecurring?: boolean;
  
  // Communication Log
  communications?: Communication[];
}