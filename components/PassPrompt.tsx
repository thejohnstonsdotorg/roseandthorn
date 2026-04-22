import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../lib/theme';

interface PassPromptProps {
  nextMemberName: string;
  nextMemberEmoji: string;
  onReady: () => void;
}

export function PassPrompt({ nextMemberName, nextMemberEmoji, onReady }: PassPromptProps) {
  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.colors.background }}>
      <Text className="text-6xl mb-6">{nextMemberEmoji}</Text>
      <Text className="text-2xl font-bold mb-2 text-center" style={{ color: theme.colors.text }}>
        Pass the phone to
      </Text>
      <Text className="text-3xl font-bold mb-8 text-center" style={{ color: theme.colors.primary }}>
        {nextMemberName}
      </Text>
      <TouchableOpacity
        onPress={onReady}
        className="px-8 py-4 rounded-2xl"
        style={{ backgroundColor: theme.colors.primary }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-semibold">I'm Ready</Text>
      </TouchableOpacity>
    </View>
  );
}
