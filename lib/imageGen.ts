/**
 * lib/imageGen.ts
 *
 * Thin interface for image generation. All callers go through this module —
 * never directly to proceduralArt or the MediaPipe module.
 *
 * This keeps the AI backend swappable: when LiteRT-LM ships on-device image
 * generation, add a new backend implementation and update `generate()` to
 * dispatch to it. No schema, no UI, no caller changes needed.
 */

import { generateProceduralArt, type ProceduralArtParams, type ArtResult } from './proceduralArt';
import { buildImagePrompt } from './imagePrompt';

export type ImageSource = 'procedural' | 'mediapipe' | 'apple-playground';

export interface GenerateOptions {
  text: string;
  memberName: string;
  mood: 'rose' | 'thorn';
  /** Stable seed for deterministic output; computed from text+name+date if omitted */
  seed?: number;
  /** Override the backend. Defaults to 'procedural'. */
  backend?: ImageSource;
  /** Filename for the output file (without directory) */
  filename: string;
}

export interface GenerateResult {
  uri: string;
  source: ImageSource;
  seed: number;
  prompt: string;
}

/**
 * Generate artwork for a Rose or Thorn entry.
 *
 * The procedural backend is always available and is the default.
 * The mediapipe backend is opt-in and gated by the AI Images setting.
 * Callers should not block the UI on this call — fire it after `addEntry`.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const { text, memberName, mood, seed, filename } = options;
  const backend = options.backend ?? 'procedural';
  const prompt = buildImagePrompt(text, mood);

  if (backend === 'procedural') {
    const params: ProceduralArtParams = { text, memberName, seed, mood };
    const result: ArtResult = await generateProceduralArt(params, filename);
    return { uri: result.uri, source: 'procedural', seed: result.seed, prompt };
  }

  if (backend === 'mediapipe') {
    // Dynamically import the MediaPipe module so it doesn't affect
    // JS bundle when the feature is disabled or unavailable.
    try {
      const { ExpoMediaPipeImageGen } = await import(
        '../modules/expo-mediapipe-image-gen/src/ExpoMediaPipeImageGenModule'
      );
      const base64 = await ExpoMediaPipeImageGen.generate(prompt, seed ?? 0, 20);
      // Write base64 to the images dir
      const { documentDirectory, writeAsStringAsync, getInfoAsync, makeDirectoryAsync, EncodingType } =
        await import('expo-file-system/legacy');
      const imagesDir = `${documentDirectory ?? ''}roseandthorn/images/`;
      const dirInfo = await getInfoAsync(imagesDir);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(imagesDir, { intermediates: true });
      }
      const filePath = `${imagesDir}${filename}`;
      await writeAsStringAsync(filePath, base64, { encoding: EncodingType.Base64 });
      return {
        uri: `file://${filePath}`,
        source: 'mediapipe',
        seed: seed ?? 0,
        prompt,
      };
    } catch {
      // MediaPipe unavailable or failed — fall back to procedural silently
      const params: ProceduralArtParams = { text, memberName, seed, mood };
      const result = await generateProceduralArt(params, filename);
      return { uri: result.uri, source: 'procedural', seed: result.seed, prompt };
    }
  }

  // Unimplemented backends fall back to procedural
  const params: ProceduralArtParams = { text, memberName, seed, mood };
  const result = await generateProceduralArt(params, filename);
  return { uri: result.uri, source: 'procedural', seed: result.seed, prompt };
}

/**
 * Returns true if the given backend is available on this device.
 * Used to gate UI elements (e.g., "✨ Regenerate with AI" button).
 */
export async function isAvailable(backend: ImageSource): Promise<boolean> {
  if (backend === 'procedural') return true;
  if (backend === 'mediapipe') {
    try {
      const { ExpoMediaPipeImageGen } = await import(
        '../modules/expo-mediapipe-image-gen/src/ExpoMediaPipeImageGenModule'
      );
      return await ExpoMediaPipeImageGen.isAvailable();
    } catch {
      return false;
    }
  }
  return false;
}
