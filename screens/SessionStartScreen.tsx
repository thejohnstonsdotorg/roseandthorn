import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamilyStore } from '../stores/familyStore';
import { useSessionStore } from '../stores/sessionStore';
import { theme } from '../lib/theme';

interface SessionStartScreenProps {
  onStartSession: (firstMember: { name: string; emoji: string }) => void;
}

export function SessionStartScreen({ onStartSession }: SessionStartScreenProps) {
  const { members } = useFamilyStore();
  const { setPresentMembers } = useSessionStore();
  const [selected, setSelected] = useState<Set<number>>(new Set(members.map((m) => m.id)));
  const insets = useSafeAreaInsets();

  const toggleMember = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleStart = () => {
    const present = members.filter((m) => selected.has(m.id));
    if (present.length === 0) return;
    setPresentMembers(present.map((m) => ({ id: m.id, name: m.name, avatar_emoji: m.avatar_emoji })));
    onStartSession({ name: present[0].name, emoji: present[0].avatar_emoji });
  };

  return (
    <ScrollView
      className="flex-1 px-6"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
    >
      <View style={{ paddingTop: insets.top + 16 }} className="pb-6">
        <Text className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
          Who's at the table?
        </Text>
        <Text className="text-base" style={{ color: theme.colors.textMuted }}>
          Tap to toggle who's sharing tonight.
        </Text>
      </View>

      {members.map((member) => {
        const isSelected = selected.has(member.id);
        return (
          <TouchableOpacity
            key={member.id}
            onPress={() => toggleMember(member.id)}
            className="flex-row items-center p-4 rounded-2xl mb-3"
            style={{
              backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
              borderWidth: 2,
              borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            }}
            activeOpacity={0.8}
          >
            <Text className="text-3xl mr-4">{member.avatar_emoji}</Text>
            <Text
              className="text-lg font-semibold flex-1"
              style={{ color: isSelected ? theme.colors.primaryDark : theme.colors.text }}
            >
              {member.name}
            </Text>
            {isSelected && (
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Text className="text-white text-sm font-bold">✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={handleStart}
        className="py-4 rounded-2xl items-center mt-6 mb-4"
        style={{
          backgroundColor: selected.size > 0 ? theme.colors.primary : theme.colors.border,
          opacity: selected.size > 0 ? 1 : 0.6,
        }}
        activeOpacity={0.8}
        disabled={selected.size === 0}
      >
        <Text className="text-white text-lg font-semibold">Begin Sharing</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
