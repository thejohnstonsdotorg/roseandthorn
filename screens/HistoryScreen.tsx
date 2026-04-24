import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '../db/migrations';
import { theme } from '../lib/theme';
import { EntryArtwork } from '../components/EntryArtwork';

interface HistorySession {
  id: number;
  date: number;
  closing_word: string | null;
  rose_count: number;
  thorn_count: number;
  thumbnail_uri: string | null;
}

interface HistoryScreenProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HistorySession>(`
      SELECT
        s.id,
        s.date,
        s.closing_word,
        (SELECT COUNT(*) FROM rose WHERE session_id = s.id) as rose_count,
        (SELECT COUNT(*) FROM thorn WHERE session_id = s.id) as thorn_count,
        (SELECT r.image_uri FROM rose r WHERE r.session_id = s.id AND r.image_uri IS NOT NULL LIMIT 1) as thumbnail_uri
      FROM session s
      ORDER BY s.date DESC
    `);
    setSessions(rows);
  }

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <View className="pb-4 px-6 flex-row items-center" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          History
        </Text>
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {sessions.length === 0 ? (
          <View className="items-center mt-12">
            <Text className="text-4xl mb-4">📖</Text>
            <Text className="text-base text-center" style={{ color: theme.colors.textMuted }}>
              No sessions yet. Start your first Rose & Thorn tonight!
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              className="p-4 rounded-2xl mb-3"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-start">
                {session.thumbnail_uri ? (
                  <View style={{ marginRight: 12 }}>
                    <EntryArtwork
                      imageUri={session.thumbnail_uri}
                      label={`Session artwork for ${formatDate(session.date)}`}
                      size={72}
                    />
                  </View>
                ) : null}
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                      {formatDate(session.date)}
                    </Text>
                    {session.closing_word ? (
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: theme.colors.primaryLight }}
                      >
                        <Text className="text-sm font-medium" style={{ color: theme.colors.primaryDark }}>
                          {session.closing_word}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="flex-row">
                    <Text className="text-sm mr-4" style={{ color: theme.colors.rose }}>
                      🌹 {session.rose_count} Roses
                    </Text>
                    <Text className="text-sm" style={{ color: theme.colors.emerald }}>
                      🌵 {session.thorn_count} Thorns
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
