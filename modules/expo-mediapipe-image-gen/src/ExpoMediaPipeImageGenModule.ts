/**
 * ExpoMediaPipeImageGenModule.ts
 *
 * TypeScript bridge for the ExpoMediaPipeImageGen native Expo Module.
 * The native implementation lives in the Android Kotlin layer.
 */

import { requireOptionalNativeModule, EventEmitter } from 'expo-modules-core';

const nativeModule = requireOptionalNativeModule('ExpoMediaPipeImageGen');

type MediaPipeEvents = {
  onDownloadProgress: (event: { bytesReceived: number; totalBytes: number; fraction: number }) => void;
};

const emitter = nativeModule ? new EventEmitter<MediaPipeEvents>(nativeModule) : null;

export interface DownloadProgressEvent {
  bytesReceived: number;
  totalBytes: number;
  fraction: number;
}

export const ExpoMediaPipeImageGen = {
  /** Returns true if MediaPipe is available and the model is downloaded. */
  async isAvailable(): Promise<boolean> {
    if (!nativeModule) return false;
    return nativeModule.isAvailable();
  },

  /** Returns true if the SD 1.5 model is present on-device. */
  async isModelDownloaded(): Promise<boolean> {
    if (!nativeModule) return false;
    return nativeModule.isModelDownloaded();
  },

  /**
   * Downloads the SD 1.5 model (~1.9 GB) from GitHub Releases.
   * Listen for progress via `addDownloadProgressListener`.
   */
  async downloadModel(): Promise<void> {
    if (!nativeModule) throw new Error('ExpoMediaPipeImageGen unavailable on this platform');
    return nativeModule.downloadModel();
  },

  /**
   * Generates an image from the given prompt.
   * @returns Base64-encoded PNG string.
   */
  async generate(prompt: string, seed: number, iterations: number = 20): Promise<string> {
    if (!nativeModule) throw new Error('ExpoMediaPipeImageGen unavailable on this platform');
    return nativeModule.generate(prompt, seed, iterations);
  },

  /**
   * Subscribe to download progress events.
   * @returns Subscription object — call `.remove()` to unsubscribe.
   */
  addDownloadProgressListener(
    listener: (event: DownloadProgressEvent) => void
  ): { remove: () => void } {
    if (!emitter) return { remove: () => {} };
    const sub = emitter.addListener('onDownloadProgress', listener);
    return { remove: () => sub.remove() };
  },
};
