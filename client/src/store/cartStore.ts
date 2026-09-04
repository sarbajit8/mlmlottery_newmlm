import { create } from 'zustand';
import type { Ticket } from '@/types/api';

interface CartState {
  drawSlotId: number | null;
  drawDate: string | null;
  items: Ticket[];
  pendingIds: Set<number>;
  setContext: (drawSlotId: number, drawDate: string) => void;
  add: (ticket: Ticket) => void;
  remove: (ticketId: number) => void;
  clear: () => void;
  markPending: (ticketIds: number[]) => void;
  removeMany: (ticketIds: number[]) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  drawSlotId: null,
  drawDate: null,
  items: [],
  pendingIds: new Set(),
  setContext: (drawSlotId, drawDate) => {
    const state = get();
    if (state.drawSlotId !== drawSlotId || state.drawDate !== drawDate) {
      set({ drawSlotId, drawDate, items: [], pendingIds: new Set() });
    }
  },
  add: (ticket) => {
    if (get().items.some((t) => t.id === ticket.id)) return;
    set((s) => ({ items: [...s.items, ticket] }));
  },
  remove: (ticketId) => set((s) => ({ items: s.items.filter((t) => t.id !== ticketId) })),
  clear: () => set({ items: [], pendingIds: new Set() }),
  markPending: (ticketIds) => set({ pendingIds: new Set(ticketIds) }),
  removeMany: (ticketIds) =>
    set((s) => ({ items: s.items.filter((t) => !ticketIds.includes(t.id)), pendingIds: new Set() })),
}));
