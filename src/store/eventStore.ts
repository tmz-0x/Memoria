import { create } from 'zustand';
import { api, EventSettings } from '../api/mockApi';

interface EventState {
  settings: EventSettings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<EventSettings>) => Promise<void>;
}

export const useEventStore = create<EventState>((set) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const s = await api.getEventSettings();
      set({ settings: s, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateSettings: async (newSettings: Partial<EventSettings>) => {
    const updated = await api.updateEventSettings(newSettings);
    set({ settings: updated });
  },
}));
