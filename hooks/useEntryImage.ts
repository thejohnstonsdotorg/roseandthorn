/**
 * hooks/useEntryImage.ts
 *
 * Orchestrates image generation for a single Rose or Thorn entry.
 * Handles:
 *   - Current image URI state
 *   - MediaPipe availability check
 *   - "✨ Regenerate with AI" action
 *   - Progress state during AI generation
 *   - Silent fallback to procedural on any AI failure
 */

import { useState, useEffect } from 'react';
import { generate, isAvailable } from '../lib/imageGen';
import { useSettingsStore } from '../stores/settingsStore';

export interface UseEntryImageOptions {
  /** Current image URI from the session entry (may be undefined while generating) */
  currentUri?: string;
  /** Current image seed (used to regenerate the same procedural image) */
  currentSeed?: number;
  /** Entry text (rose or thorn content) */
  text: string;
  memberName: string;
  mood: 'rose' | 'thorn';
  /** Unique filename base — caller must make this stable and unique per entry */
  filenameBase: string;
  /** Called with the new URI + metadata when a new image is ready */
  onNewImage?: (uri: string, seed: number, source: 'procedural' | 'mediapipe' | 'apple-playground', prompt: string) => void;
}

export interface UseEntryImageResult {
  imageUri?: string;
  aiGenerating: boolean;
  showAiRegenerate: boolean;
  regenerateWithAI: () => void;
}

export function useEntryImage(options: UseEntryImageOptions): UseEntryImageResult {
  const { currentUri, currentSeed, text, memberName, mood, filenameBase, onNewImage } = options;
  const { aiImagesEnabled } = useSettingsStore();

  const [imageUri, setImageUri] = useState<string | undefined>(currentUri);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [mediaPipeAvailable, setMediaPipeAvailable] = useState(false);

  // Sync external URI changes (e.g. when procedural art finishes generating)
  useEffect(() => {
    if (currentUri && !imageUri) {
      setImageUri(currentUri);
    }
  }, [currentUri]);

  // Check MediaPipe availability once on mount
  useEffect(() => {
    if (aiImagesEnabled) {
      isAvailable('mediapipe').then((avail) => {
        console.log('[useEntryImage] mediaPipeAvailable:', avail);
        setMediaPipeAvailable(avail);
      });
    }
  }, [aiImagesEnabled]);

  const showAiRegenerate = aiImagesEnabled && mediaPipeAvailable && !aiGenerating;

  const regenerateWithAI = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      const result = await generate({
        text,
        memberName,
        mood,
        backend: 'mediapipe',
        filename: `${filenameBase}-mediapipe.png`,
      });
      setImageUri(result.uri);
      onNewImage?.(result.uri, result.seed, result.source, result.prompt);
    } catch (err) {
      console.error('[useEntryImage] AI generation failed:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  return {
    imageUri,
    aiGenerating,
    showAiRegenerate,
    regenerateWithAI,
  };
}
