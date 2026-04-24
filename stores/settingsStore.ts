/**
 * stores/settingsStore.ts
 *
 * Zustand store for user-configurable app settings, backed by the
 * `app_settings` SQLite table. Settings are loaded on app start.
 *
 * Reset discipline: `resetSettings()` must be called from Settings → Reset All Data
 * so that AI Images consent is cleared alongside family data.
 *
 * AI backend tri-state:
 *   aiImagesEnabled = false          → Off (procedural only)
 *   aiImagesEnabled = true
 *     aiBackend = 'mediapipe'        → On-device (MediaPipe SD 1.5, ~3–8 s)
 *     aiBackend = 'cloud'            → Cloud (FLUX.1 schnell, <2 s, BYO key)
 *
 * Migration note: existing users who had aiImagesEnabled=true (mediapipe path)
 * will have aiBackend loaded as 'mediapipe' to preserve their prior behavior.
 */

import { create } from 'zustand';
import { getDatabase } from '../db/migrations';
import type { CloudProvider } from '../lib/cloudImage';

interface SettingsState {
  /** Whether AI image generation is enabled (opt-in, off by default). */
  aiImagesEnabled: boolean;
  /** Which AI backend to use when aiImagesEnabled is true. */
  aiBackend: 'mediapipe' | 'cloud';
  /** Cloud provider for FLUX.1 schnell. Default: 'fal'. */
  cloudProvider: CloudProvider;
  /** API key for the selected cloud provider. Empty string means not set. */
  cloudApiKey: string;
  /** Whether the MediaPipe AI model is currently downloading. */
  aiModelDownloading: boolean;
  /** Download progress 0–1 (null when not downloading). */
  aiModelProgress: number | null;
  /** Whether settings have been loaded from SQLite. */
  loaded: boolean;

  loadSettings: () => Promise<void>;
  setAiImagesEnabled: (enabled: boolean) => Promise<void>;
  setAiBackend: (backend: 'mediapipe' | 'cloud') => Promise<void>;
  setCloudProvider: (provider: CloudProvider) => Promise<void>;
  setCloudApiKey: (key: string) => Promise<void>;
  testCloudKey: () => Promise<{ ok: boolean; message: string }>;
  setAiModelDownloading: (downloading: boolean, progress?: number | null) => void;
  startModelDownload: () => Promise<void>;
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  aiImagesEnabled: false,
  aiBackend: 'cloud',
  cloudProvider: 'fal',
  cloudApiKey: '',
  aiModelDownloading: false,
  aiModelProgress: null,
  loaded: false,

  async loadSettings() {
    const aiImages = await getSetting('ai_images_enabled');
    const rawBackend = await getSetting('ai_backend');
    const rawProvider = await getSetting('cloud_provider');
    const rawApiKey = await getSetting('cloud_api_key');

    // Migration path: if aiImagesEnabled was set but aiBackend is null,
    // this is an existing user who used MediaPipe — preserve that.
    const aiImagesEnabled = aiImages === 'true';
    const aiBackend: 'mediapipe' | 'cloud' =
      rawBackend === 'mediapipe' ? 'mediapipe'
      : rawBackend === 'cloud' ? 'cloud'
      : aiImagesEnabled ? 'mediapipe'  // pre-v1.5 user had MediaPipe enabled
      : 'cloud';                        // default for new installs

    const cloudProvider: CloudProvider =
      (rawProvider as CloudProvider | null) ?? 'fal';

    set({
      aiImagesEnabled,
      aiBackend,
      cloudProvider,
      cloudApiKey: rawApiKey ?? '',
      loaded: true,
    });
  },

  async setAiImagesEnabled(enabled: boolean) {
    await setSetting('ai_images_enabled', enabled ? 'true' : 'false');
    set({ aiImagesEnabled: enabled });
  },

  async setAiBackend(backend: 'mediapipe' | 'cloud') {
    await setSetting('ai_backend', backend);
    set({ aiBackend: backend });
  },

  async setCloudProvider(provider: CloudProvider) {
    await setSetting('cloud_provider', provider);
    set({ cloudProvider: provider });
  },

  async setCloudApiKey(key: string) {
    await setSetting('cloud_api_key', key);
    set({ cloudApiKey: key });
  },

  async testCloudKey() {
    const { cloudProvider, cloudApiKey } = get();
    if (!cloudApiKey) {
      return { ok: false, message: 'No API key entered' };
    }
    // Dynamic import keeps cloudImage.ts out of the initial bundle
    const { testCloudCredentials } = await import('../lib/cloudImage');
    return testCloudCredentials(cloudProvider, cloudApiKey);
  },

  async startModelDownload() {
    const { ExpoMediaPipeImageGen } = await import(
      '../modules/expo-mediapipe-image-gen/src/ExpoMediaPipeImageGenModule'
    );

    // Skip the 1.9 GB download if model files are already present on-device
    const alreadyDownloaded = await ExpoMediaPipeImageGen.isModelDownloaded();
    if (alreadyDownloaded) {
      await setSetting('ai_images_enabled', 'true');
      await setSetting('ai_backend', 'mediapipe');
      set({ aiImagesEnabled: true, aiBackend: 'mediapipe' });
      return;
    }

    set({ aiModelDownloading: true, aiModelProgress: 0 });
    const sub = ExpoMediaPipeImageGen.addDownloadProgressListener((e) => {
      set({ aiModelProgress: e.fraction });
    });
    try {
      await ExpoMediaPipeImageGen.downloadModel();
      await setSetting('ai_images_enabled', 'true');
      await setSetting('ai_backend', 'mediapipe');
      set({ aiImagesEnabled: true, aiBackend: 'mediapipe', aiModelDownloading: false, aiModelProgress: null });
    } catch (err) {
      set({ aiModelDownloading: false, aiModelProgress: null });
      throw err;
    } finally {
      sub.remove();
    }
  },

  setAiModelDownloading(downloading: boolean, progress: number | null = null) {
    set({ aiModelDownloading: downloading, aiModelProgress: progress });
  },

  async resetSettings() {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_settings');
    set({
      aiImagesEnabled: false,
      aiBackend: 'cloud',
      cloudProvider: 'fal',
      cloudApiKey: '',
      aiModelDownloading: false,
      aiModelProgress: null,
    });
  },
}));
