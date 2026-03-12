import { create } from 'zustand';

interface OfficeState {
  activeRoomId: string | null;
  // Future: BILLY position, room data, character states
}

export const useOfficeStore = create<OfficeState>(() => ({
  activeRoomId: null,
}));
