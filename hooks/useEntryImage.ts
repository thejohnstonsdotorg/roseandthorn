/**
 * hooks/useEntryImage.ts
 *
 * Orchestrates image generation for a single Rose or Thorn entry.
 * Handles:
 *   - Current image URI state
 *   - Backend availability check (cloud / mediapipe / procedural)
 *   - "✨ Regenerate with AI" action
 *   - Progress state during AI generation
 *   - Silent fallback to procedural on any AI failure
 *
 * Backend selection:
 *   - aiImagesEnabled=false           → 'procedural' (no AI button)
 *   - aiImagesEnabled=true, backend='cloud', key set  → 'cloud'
 *   - aiImagesEnabled=true, backend='mediapipe'       → 'mediapipe'
 *   - otherwise                                       → 'procedural'
 */

import { useState, useEffect } from 'react';
import { generate, isAvailable, type ImageSource } from '../lib/imageGen';
import { useSettingsStore } from '../stores/settingsStore';

export interface UseEntryImageOptions {
  /** Current image URI from the session entry (may be undefined while generating) */
  currentUri?: string;
  /** Current image seed (used to regenerate the same procedural image) */
  currentSeed?: number;
  /** Entry text (rose or thorn content) */
  text: string;
  memberName: string;
  /** The member's chosen emoji avatar — drives the AI image character */
  memberEmoji?: string;
  mood: 'rose' | 'thorn';
  /** Unique filename base — caller must make this stable and unique per entry */
  filenameBase: string;
  /** Called with the new URI + metadata when a new image is ready */
  onNewImage?: (uri: string, seed: number, source: ImageSource, prompt: string) => void;
}

export interface UseEntryImageResult {
  imageUri?: string;
  aiGenerating: boolean;
  showAiRegenerate: boolean;
  regenerateWithAI: () => void;
}

export function useEntryImage(options: UseEntryImageOptions): UseEntryImageResult {
  const { currentUri, text, memberName, memberEmoji, mood, filenameBase, onNewImage } = options;
  const { aiImagesEnabled, aiBackend, cloudApiKey } = useSettingsStore();

  const [imageUri, setImageUri] = useState<string | undefined>(currentUri);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  // Determine the active backend based on settings
  const activeBackend: ImageSource =
    !aiImagesEnabled ? 'procedural'
    : aiBackend === 'cloud' && cloudApiKey ? 'cloud'
    : aiBackend === 'mediapipe' ? 'mediapipe'
    : 'procedural';

  // Sync external URI changes (e.g. when procedural art finishes generating,
  // or when a parent component persists a new URI back to us)
  useEffect(() => {
    if (currentUri) {
      setImageUri(currentUri);
    }
  }, [currentUri]);

  // Check AI backend availability once when aiImagesEnabled or activeBackend changes
  useEffect(() => {
    if (!aiImagesEnabled) {
      setAiAvailable(false);
      return;
    }
    isAvailable(activeBackend).then((avail) => {
      console.log(`[useEntryImage] ${activeBackend} available:`, avail);
      setAiAvailable(avail);
    });
  }, [aiImagesEnabled, activeBackend]);

  // Button is visible whenever AI is enabled and the active backend is available
  const showAiRegenerate = aiImagesEnabled && aiAvailable && activeBackend !== 'procedural';

  const regenerateWithAI = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      // Randomize the seed on regenerate — re-running with the same seed
      // produces an identical image, which is not what the user wants here.
      const result = await generate({
        text,
        memberName,
        memberEmoji,
        mood,
        backend: activeBackend,
        // Omit seed → generate() will pick a random one for cloud, or derive from
        // text+name+date for procedural (still deterministic on fallback).
        filename: `${filenameBase}-${activeBackend}.${activeBackend === 'mediapipe' ? 'png' : 'jpg'}`,
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
