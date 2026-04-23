/**
 * components/EmojiPicker.tsx
 *
 * A modal emoji picker for choosing a member's avatar character.
 * The set is curated to work well as SD 1.5 image subjects — animals
 * and fantasy characters that the model renders clearly.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { theme } from '../lib/theme';

export const AVATAR_EMOJIS = [
  // Animals — best SD 1.5 subjects
  '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐺', '🐸',
  '🐶', '🐱', '🐰', '🐭', '🐹', '🐮', '🐷', '🐵',
  '🐧', '🦆', '🦉', '🐢', '🐉', '🦄', '🦋', '🐝',
  // Fun / fantasy
  '🤖', '👾', '👻', '🧙', '🧚', '🧜', '🧸',
  // Food characters
  '🍕', '🍔', '🌮', '🍦', '🍩',
  // Nature
  '🌵', '🍄', '⭐', '🌙', '🌈',
];

interface EmojiPickerProps {
  visible: boolean;
  current: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ visible, current, onSelect, onClose }: EmojiPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose your character</Text>
        <ScrollView contentContainerStyle={styles.grid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.cell, emoji === current && styles.cellSelected]}
              onPress={() => { onSelect(emoji); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  cell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  cellSelected: {
    backgroundColor: theme.colors.roseLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  emoji: {
    fontSize: 28,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
