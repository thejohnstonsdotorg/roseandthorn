import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../lib/theme';
import type { Prompt } from '../lib/prompts';

interface DeepeningPromptProps {
  prompt: Prompt;
  onAnswer: (answer: string) => void;
}

export function DeepeningPrompt({ prompt, onAnswer }: DeepeningPromptProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const categoryLabel: Record<string, string> = {
    appreciation: 'Appreciation',
    generosity: 'Generosity',
    curiosity: 'Curiosity',
  };

  const categoryColor: Record<string, string> = {
    appreciation: theme.colors.rose,
    generosity: theme.colors.emerald,
    curiosity: theme.colors.primary,
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onAnswer(answer);
  };

  if (submitted) {
    return (
      <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: theme.colors.emeraldLight }}>
        <Text className="text-sm font-semibold mb-1" style={{ color: theme.colors.emerald }}>
          {categoryLabel[prompt.category]}
        </Text>
        <Text className="text-base" style={{ color: theme.colors.text }}>
          {prompt.text}
        </Text>
        {answer.length > 0 && (
          <Text className="text-base mt-2 italic" style={{ color: theme.colors.textMuted }}>
            {answer}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="mt-4">
      <View className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.primaryLight }}>
        <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: categoryColor[prompt.category] }}>
          {categoryLabel[prompt.category]}
        </Text>
        <Text className="text-lg font-medium mb-4" style={{ color: theme.colors.text }}>
          {prompt.text}
        </Text>
        <TextInput
          className="border rounded-xl p-3 text-base"
          style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }}
          placeholder="Share a little more..."
          placeholderTextColor={theme.colors.textMuted}
          value={answer}
          onChangeText={setAnswer}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <TouchableOpacity
          onPress={handleSubmit}
          className="mt-4 py-3 rounded-xl items-center"
          style={{ backgroundColor: theme.colors.primary }}
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
