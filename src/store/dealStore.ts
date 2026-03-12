import { create } from 'zustand';

interface DealState {
  activeDealId: string | null;
  // Future: deal list, deal CRUD
}

export const useDealStore = create<DealState>(() => ({
  activeDealId: null,
}));
