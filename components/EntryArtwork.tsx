/**
 * components/EntryArtwork.tsx
 *
 * Renders entry artwork: either a procedural Skia canvas (when the image URI
 * is not yet ready) or an expo-image display of a saved PNG.
 *
 * Shows a subtle "✨ Regenerate with AI" button if MediaPipe is available
 * and the AI Images setting is enabled.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../lib/theme';

interface EntryArtworkProps {
  /** file:// URI to the generated artwork PNG. If undefined, shows a loading state. */
  imageUri?: string;
  /** Label for accessibility (e.g. "Ken's Rose artwork") */
  label?: string;
  /** Size in pixels; defaults to 280 */
  size?: number;
  /** If true, show the ✨ Regenerate with AI button */
  showAiRegenerate?: boolean;
  /** Called when user taps the ✨ button */
  onRegenerateWithAI?: () => void;
  /** True while AI generation is in progress */
  aiGenerating?: boolean;
}

export function EntryArtwork({
  imageUri,
  label,
  size = 280,
  showAiRegenerate = false,
  onRegenerateWithAI,
  aiGenerating = false,
}: EntryArtworkProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size, borderRadius: theme.borderRadius.lg }}
          contentFit="cover"
          accessibilityLabel={label}
          transition={300}
        />
      ) : (
        // Placeholder while the procedural art is generating (should be <100ms in practice)
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
        </View>
      )}

      {showAiRegenerate && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={onRegenerateWithAI}
          disabled={aiGenerating}
          activeOpacity={0.75}
          accessibilityLabel="Regenerate with AI"
        >
          {aiGenerating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.aiButtonText}>✨</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  aiButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  aiButtonText: {
    fontSize: 18,
  },
});
