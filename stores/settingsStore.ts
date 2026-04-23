/**
 * stores/settingsStore.ts
 *
 * Zustand store for user-configurable app settings, backed by the
 * `app_settings` SQLite table. Settings are loaded on app start.
 *
 * Reset discipline: `resetSettings()` must be called from Settings → Reset All Data
 * so that AI Images consent is cleared alongside family data.
 */

import { create } from 'zustand';
import { getDatabase } from '../db/migrations';

interface SettingsState {
  /** Whether AI image generation is enabled (opt-in, off by default). */
  aiImagesEnabled: boolean;
  /** Whether the AI model is currently downloading. */
  aiModelDownloading: boolean;
  /** Download progress 0–1 (null when not downloading). */
  aiModelProgress: number | null;
  /** Whether settings have been loaded from SQLite. */
  loaded: boolean;

  loadSettings: () => Promise<void>;
  setAiImagesEnabled: (enabled: boolean) => Promise<void>;
  setAiModelDownloading: (downloading: boolean, progress?: number | null) => void;
  resetSettings: () => Promise<void>;
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export const useSettingsStore = create<SettingsState>((set) => ({
  aiImagesEnabled: false,
  aiModelDownloading: false,
  aiModelProgress: null,
  loaded: false,

  async loadSettings() {
    const aiImages = await getSetting('ai_images_enabled');
    set({
      aiImagesEnabled: aiImages === 'true',
      loaded: true,
    });
  },

  async setAiImagesEnabled(enabled: boolean) {
    await setSetting('ai_images_enabled', enabled ? 'true' : 'false');
    set({ aiImagesEnabled: enabled });
  },

  setAiModelDownloading(downloading: boolean, progress: number | null = null) {
    set({ aiModelDownloading: downloading, aiModelProgress: progress });
  },

  async resetSettings() {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_settings');
    set({
      aiImagesEnabled: false,
      aiModelDownloading: false,
      aiModelProgress: null,
    });
  },
}));
