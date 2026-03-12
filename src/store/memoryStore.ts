import { create } from 'zustand';

interface MemoryState {
  // Future: agent memory, fact extraction
}

export const useMemoryStore = create<MemoryState>(() => ({}));
