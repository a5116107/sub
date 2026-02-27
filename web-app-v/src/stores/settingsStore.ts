import { create } from 'zustand';
import { settingsApi, type PublicSettings } from '../api/settings';

interface SettingsState {
  settings: PublicSettings | null;
  loaded: boolean;
  loading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  loaded: false,
  loading: false,

  fetchSettings: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const settings = await settingsApi.getPublic();
      set({ settings, loaded: true, loading: false });
    } catch {
      // Public settings endpoint may not exist, use defaults
      set({
        settings: {
          site_name: 'NEXUS',
          registration_enabled: true,
          oauth_providers: [],
        },
        loaded: true,
        loading: false,
      });
    }
  },
}));
