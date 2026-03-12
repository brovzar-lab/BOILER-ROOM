import { create } from 'zustand';

interface FileState {
  // Future: file list, upload state
}

export const useFileStore = create<FileState>(() => ({}));
