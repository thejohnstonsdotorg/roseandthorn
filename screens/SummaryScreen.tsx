import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSessionStore } from '../stores/sessionStore';
import { getDatabase } from '../db/migrations';
import { theme } from '../lib/theme';

interface SummaryScreenProps {
  onFinish: () => void;
}

export function SummaryScreen({ onFinish }: SummaryScreenProps) {
  const { entries } = useSessionStore();
  const [word, setWord] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const db = await getDatabase();
    const now = Date.now();

    // Get family
    const families = await db.getAllAsync<{ id: number }>('SELECT id FROM family LIMIT 1');
    if (families.length === 0) return;
    const familyId = families[0].id;

    // Create session
    const sessionResult = await db.runAsync(
      'INSERT INTO session (family_id, date, closing_word, created_at) VALUES (?, ?, ?, ?)',
      [familyId, now, word.trim(), now]
    );
    const sessionId = sessionResult.lastInsertRowId;

    // Save roses and thorns
    for (const entry of entries) {
      if (entry.rose) {
        await db.runAsync(
          'INSERT INTO rose (session_id, member_id, content, deepening_prompt, deepening_answer, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [sessionId, entry.memberId, entry.rose, entry.rosePrompt, entry.roseAnswer, now]
        );
      }
      if (entry.thorn) {
        await db.runAsync(
          'INSERT INTO thorn (session_id, member_id, content, deepening_prompt, deepening_answer, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [sessionId, entry.memberId, entry.thorn, entry.thornPrompt, entry.thornAnswer, now]
        );
      }
    }

    setSaved(true);
    setTimeout(() => {
      onFinish();
    }, 1500);
  };

  return (
    <ScrollView className="flex-1 px-6" style={{ backgroundColor: theme.colors.background }}>
      <View className="pt-12 pb-4 items-center">
        <Text className="text-4xl mb-2">🌟</Text>
        <Text className="text-3xl font-bold mb-2 text-center" style={{ color: theme.colors.text }}>
          Wonderful Sharing
        </Text>
        <Text className="text-base text-center" style={{ color: theme.colors.textMuted }}>
          Everyone has shared their roses and thorns.
        </Text>
      </View>

      <View className="mt-4 mb-6">
        {entries.map((entry, index) => (
          <View
            key={index}
            className="p-4 rounded-2xl mb-3"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-2">{entry.memberEmoji}</Text>
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                {entry.memberName}
              </Text>
            </View>
            {entry.rose ? (
              <View className="mb-2">
                <Text className="text-sm font-semibold" style={{ color: theme.colors.rose }}>
                  Rose
                </Text>
                <Text className="text-base" style={{ color: theme.colors.text }}>
                  {entry.rose}
                </Text>
              </View>
            ) : null}
            {entry.thorn ? (
              <View>
                <Text className="text-sm font-semibold" style={{ color: theme.colors.emerald }}>
                  Thorn
                </Text>
                <Text className="text-base" style={{ color: theme.colors.text }}>
                  {entry.thorn}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {!saved ? (
        <>
          <Text className="text-base font-semibold mb-2 text-center" style={{ color: theme.colors.text }}>
            One word to describe our family's day:
          </Text>
          <TextInput
            className="border rounded-2xl p-4 text-base text-center mb-6"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            }}
            placeholder="Grateful, chaotic, peaceful..."
            placeholderTextColor={theme.colors.textMuted}
            value={word}
            onChangeText={setWord}
          />
          <TouchableOpacity
            onPress={handleSave}
            className="py-4 rounded-2xl items-center mb-8"
            style={{ backgroundColor: theme.colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold">Save & Close</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold" style={{ color: theme.colors.emerald }}>
            Saved! 🌹
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
