import { create } from 'zustand';
import type { FileRecord } from '@/types/file';
import type { AgentId } from '@/types/agent';
import { processDroppedFile, deleteFile, getFilesForAgent, shareFileWithAllAgents } from '@/services/files/fileService';
import { useDealStore } from '@/store/dealStore';

interface FileState {
  files: FileRecord[];
  isProcessing: boolean;

  addFile: (file: File, agentId: AgentId) => Promise<void>;
  removeFile: (fileId: string) => Promise<void>;
  loadFiles: (agentId: AgentId, dealId: string) => Promise<void>;
  shareFile: (fileRecord: FileRecord) => Promise<void>;
  getFilesByAgent: (agentId: AgentId) => FileRecord[];
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  isProcessing: false,

  addFile: async (file: File, agentId: AgentId) => {
    const dealId = useDealStore.getState().activeDealId ?? 'default';
    set({ isProcessing: true });
    try {
      const record = await processDroppedFile(file, agentId, dealId);
      set((state) => ({
        files: [...state.files, record],
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Failed to process file:', error);
      set({ isProcessing: false });
    }
  },

  removeFile: async (fileId: string) => {
    await deleteFile(fileId);
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    }));
  },

  loadFiles: async (agentId: AgentId, dealId: string) => {
    const files = await getFilesForAgent(agentId, dealId);
    set({ files });
  },

  shareFile: async (fileRecord: FileRecord) => {
    const dealId = useDealStore.getState().activeDealId ?? 'default';
    const copies = await shareFileWithAllAgents(fileRecord, dealId);
    set((state) => ({
      files: [...state.files, ...copies],
    }));
  },

  getFilesByAgent: (agentId: AgentId) => {
    return get().files.filter((f) => f.agentId === agentId);
  },
}));
