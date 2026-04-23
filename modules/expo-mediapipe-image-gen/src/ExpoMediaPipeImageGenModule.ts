/**
 * ExpoMediaPipeImageGenModule.ts
 *
 * TypeScript bridge for the ExpoMediaPipeImageGen native Expo Module.
 * The native implementation lives in the Android Kotlin layer.
 * This file is a stub — the actual native binding is registered by the
 * Expo Modules API at runtime.
 *
 * On platforms / devices where the module is unavailable, all methods
 * reject with an error and imageGen.ts catches + falls back to procedural.
 */

import { requireOptionalNativeModule } from 'expo-modules-core';

const nativeModule = requireOptionalNativeModule('ExpoMediaPipeImageGen');

export const ExpoMediaPipeImageGen = {
  /**
   * Returns true if MediaPipe Image Generator is available and the model is downloaded.
   */
  async isAvailable(): Promise<boolean> {
    if (!nativeModule) return false;
    return nativeModule.isAvailable();
  },

  /**
   * Returns true if the SD 1.5 model is present on-device.
   */
  async isModelDownloaded(): Promise<boolean> {
    if (!nativeModule) return false;
    return nativeModule.isModelDownloaded();
  },

  /**
   * Downloads the SD 1.5 model (~1.5 GB).
   * Fires progress events via the EventEmitter: `onDownloadProgress({ bytesReceived, totalBytes })`.
   */
  async downloadModel(): Promise<void> {
    if (!nativeModule) throw new Error('ExpoMediaPipeImageGen is not available on this platform');
    return nativeModule.downloadModel();
  },

  /**
   * Generates an image from the given prompt.
   * @param prompt        Text prompt for Stable Diffusion
   * @param seed          Deterministic seed (0 = random)
   * @param iterations    Denoising steps (default 20; higher = better quality, slower)
   * @returns             Base64-encoded PNG string
   */
  async generate(prompt: string, seed: number, iterations: number = 20): Promise<string> {
    if (!nativeModule) throw new Error('ExpoMediaPipeImageGen is not available on this platform');
    return nativeModule.generate(prompt, seed, iterations);
  },
};
