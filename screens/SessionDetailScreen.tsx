import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '../db/migrations';
import { theme } from '../lib/theme';
import { EntryArtwork } from '../components/EntryArtwork';

interface MemberEntry {
  memberId: number;
  memberName: string;
  memberEmoji: string;
  rose: string | null;
  rosePrompt: string | null;
  roseAnswer: string | null;
  roseImageUri: string | null;
  thorn: string | null;
  thornPrompt: string | null;
  thornAnswer: string | null;
  thornImageUri: string | null;
}

interface SessionDetailScreenProps {
  sessionId: number;
  onBack: () => void;
}

export function SessionDetailScreen({ sessionId, onBack }: SessionDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<number>(0);
  const [closingWord, setClosingWord] = useState<string | null>(null);
  const [entries, setEntries] = useState<MemberEntry[]>([]);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    const db = await getDatabase();

    const session = await db.getFirstAsync<{ date: number; closing_word: string | null }>(
      'SELECT date, closing_word FROM session WHERE id = ?',
      [sessionId]
    );
    if (!session) return;
    setDate(session.date);
    setClosingWord(session.closing_word);

    // Load all roses for this session joined with member info
    const roses = await db.getAllAsync<{
      member_id: number; name: string; avatar_emoji: string;
      content: string; deepening_prompt: string | null; deepening_answer: string | null;
      image_uri: string | null;
    }>(
      `SELECT r.member_id, m.name, m.avatar_emoji,
              r.content, r.deepening_prompt, r.deepening_answer, r.image_uri
       FROM rose r JOIN member m ON m.id = r.member_id
       WHERE r.session_id = ?
       ORDER BY r.id`,
      [sessionId]
    );

    const thorns = await db.getAllAsync<{
      member_id: number;
      content: string; deepening_prompt: string | null; deepening_answer: string | null;
      image_uri: string | null;
    }>(
      `SELECT member_id, content, deepening_prompt, deepening_answer, image_uri
       FROM thorn WHERE session_id = ?
       ORDER BY id`,
      [sessionId]
    );

    // Merge by member_id — a member has one rose and one thorn per session
    const thornByMember = new Map(thorns.map((t) => [t.member_id, t]));

    const merged: MemberEntry[] = roses.map((r) => {
      const t = thornByMember.get(r.member_id);
      return {
        memberId: r.member_id,
        memberName: r.name,
        memberEmoji: r.avatar_emoji,
        rose: r.content,
        rosePrompt: r.deepening_prompt,
        roseAnswer: r.deepening_answer,
        roseImageUri: r.image_uri,
        thorn: t?.content ?? null,
        thornPrompt: t?.deepening_prompt ?? null,
        thornAnswer: t?.deepening_answer ?? null,
        thornImageUri: t?.image_uri ?? null,
      };
    });

    setEntries(merged);
    setLoading(false);
  }

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View className="pb-4 px-6 flex-row items-center" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
            {date ? formatDate(date) : ''}
          </Text>
          {closingWord ? (
            <Text className="text-sm" style={{ color: theme.colors.textMuted }}>
              "{closingWord}"
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="px-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          {entries.map((entry) => (
            <View
              key={entry.memberId}
              className="rounded-2xl mb-4 overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {/* Member header */}
              <View
                className="flex-row items-center px-4 py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
              >
                <Text style={{ fontSize: 26, marginRight: 10 }}>{entry.memberEmoji}</Text>
                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  {entry.memberName}
                </Text>
              </View>

              <View className="p-4">
                {/* Rose */}
                {entry.rose ? (
                  <View className="mb-4">
                    <Text
                      className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{ color: theme.colors.rose }}
                    >
                      🌹 Rose
                    </Text>
                    {entry.roseImageUri ? (
                      <View className="mb-3">
                        <EntryArtwork
                          imageUri={entry.roseImageUri}
                          label={`${entry.memberName}'s rose artwork`}
                          size={280}
                        />
                      </View>
                    ) : null}
                    <Text className="text-base" style={{ color: theme.colors.text }}>
                      {entry.rose}
                    </Text>
                    {entry.rosePrompt ? (
                      <View
                        className="mt-3 p-3 rounded-xl"
                        style={{ backgroundColor: theme.colors.roseLight }}
                      >
                        <Text className="text-xs font-semibold mb-1" style={{ color: theme.colors.rose }}>
                          {entry.rosePrompt}
                        </Text>
                        {entry.roseAnswer ? (
                          <Text className="text-sm" style={{ color: theme.colors.text }}>
                            {entry.roseAnswer}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Thorn */}
                {entry.thorn ? (
                  <View>
                    <Text
                      className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{ color: theme.colors.emerald }}
                    >
                      🌵 Thorn
                    </Text>
                    {entry.thornImageUri ? (
                      <View className="mb-3">
                        <EntryArtwork
                          imageUri={entry.thornImageUri}
                          label={`${entry.memberName}'s thorn artwork`}
                          size={280}
                        />
                      </View>
                    ) : null}
                    <Text className="text-base" style={{ color: theme.colors.text }}>
                      {entry.thorn}
                    </Text>
                    {entry.thornPrompt ? (
                      <View
                        className="mt-3 p-3 rounded-xl"
                        style={{ backgroundColor: theme.colors.emeraldLight }}
                      >
                        <Text className="text-xs font-semibold mb-1" style={{ color: theme.colors.emerald }}>
                          {entry.thornPrompt}
                        </Text>
                        {entry.thornAnswer ? (
                          <Text className="text-sm" style={{ color: theme.colors.text }}>
                            {entry.thornAnswer}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
