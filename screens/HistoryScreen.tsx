import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { getDatabase } from '../db/migrations';
import { theme } from '../lib/theme';

interface HistorySession {
  id: number;
  date: number;
  closing_word: string | null;
  rose_count: number;
  thorn_count: number;
}

interface HistoryScreenProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      date: number;
      closing_word: string | null;
      rose_count: number;
      thorn_count: number;
    }>(`
      SELECT
        s.id,
        s.date,
        s.closing_word,
        (SELECT COUNT(*) FROM rose WHERE session_id = s.id) as rose_count,
        (SELECT COUNT(*) FROM thorn WHERE session_id = s.id) as thorn_count
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
      <View className="pt-12 pb-4 px-6 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          History
        </Text>
      </View>

      <ScrollView className="px-6">
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
          ))
        )}
      </ScrollView>
    </View>
  );
}
