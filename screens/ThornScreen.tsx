import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSessionStore } from '../stores/sessionStore';
import { getRandomPrompt, thornPrompts } from '../lib/prompts';
import { DeepeningPrompt } from '../components/DeepeningPrompt';
import { theme } from '../lib/theme';
import { generate } from '../lib/imageGen';

interface ThornScreenProps {
  onComplete: () => void;
}

export function ThornScreen({ onComplete }: ThornScreenProps) {
  const { presentMembers, currentIndex, markThornPromptUsed, usedThornPrompts, updateLastEntry } = useSessionStore();
  const member = presentMembers[currentIndex];
  const [content, setContent] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState(getRandomPrompt(thornPrompts, usedThornPrompts));

  if (!member) return null;

  const handleContinue = () => {
    if (content.trim().length === 0) return;
    setShowPrompt(true);
    markThornPromptUsed(prompt.text);
  };

  const handleAnswer = (answer: string) => {
    updateLastEntry({
      thorn: content,
      thornPrompt: prompt.text,
      thornAnswer: answer,
    });

    // Fire-and-forget: generate procedural art in the background.
    const tempFilename = `thorn-pending-${member.id}-${Date.now()}-procedural.png`;
    generate({
      text: content,
      memberName: member.name,
      mood: 'thorn',
      filename: tempFilename,
    })
      .then((result) => {
        updateLastEntry({
          thornImageUri: result.uri,
          thornImageSeed: result.seed,
          thornImageSource: result.source,
          thornImagePrompt: result.prompt,
        });
      })
      .catch(() => {
        // Artwork generation failure is non-fatal
      });

    onComplete();
  };

  return (
    <ScrollView className="flex-1 px-6" style={{ backgroundColor: theme.colors.background }}>
      <View className="pt-12 pb-4">
        <Text className="text-sm font-semibold mb-1" style={{ color: theme.colors.rose }}>
          {member.name}'s Turn
        </Text>
        <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
          Your Thorn
        </Text>
        <Text className="text-base mt-1" style={{ color: theme.colors.textMuted }}>
          What was a challenge you faced today?
        </Text>
      </View>

      {!showPrompt ? (
        <>
          <TextInput
            className="border rounded-2xl p-4 text-base"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              minHeight: 120,
            }}
            placeholder="Something difficult happened..."
            placeholderTextColor={theme.colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={handleContinue}
            className="py-4 rounded-2xl items-center mt-6 mb-8"
            style={{
              backgroundColor: content.trim().length > 0 ? theme.colors.primary : theme.colors.border,
              opacity: content.trim().length > 0 ? 1 : 0.6,
            }}
            activeOpacity={0.8}
            disabled={content.trim().length === 0}
          >
            <Text className="text-white text-lg font-semibold">Continue</Text>
          </TouchableOpacity>
        </>
      ) : (
        <DeepeningPrompt prompt={prompt} onAnswer={handleAnswer} />
      )}
    </ScrollView>
  );
}
