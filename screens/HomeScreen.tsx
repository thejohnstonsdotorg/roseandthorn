import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFamilyStore } from '../stores/familyStore';
import { theme } from '../lib/theme';

interface HomeScreenProps {
  onStart: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onSetup: () => void;
}

export function HomeScreen({ onStart, onHistory, onSettings, onSetup }: HomeScreenProps) {
  const { family, members, loaded, loadFamily } = useFamilyStore();

  useEffect(() => {
    loadFamily();
  }, []);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (!family) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.colors.background }}>
        <Text className="text-4xl mb-4">🌹</Text>
        <Text className="text-2xl font-bold mb-2 text-center" style={{ color: theme.colors.text }}>
          Rose & Thorn
        </Text>
        <Text className="text-base mb-8 text-center" style={{ color: theme.colors.textMuted }}>
          A daily ritual for families around the dinner table
        </Text>
        <TouchableOpacity
          onPress={onSetup}
          className="px-8 py-4 rounded-2xl"
          style={{ backgroundColor: theme.colors.primary }}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">Create Family</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 px-6" style={{ backgroundColor: theme.colors.background }}>
      <View className="items-center pt-12 pb-6">
        <Text className="text-4xl mb-2">🌹</Text>
        <Text className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>
          {family.name}
        </Text>
        <Text className="text-sm" style={{ color: theme.colors.textMuted }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onStart}
        className="py-5 rounded-2xl items-center mb-4"
        style={{ backgroundColor: theme.colors.primary }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-xl font-bold">Begin Dinner</Text>
      </TouchableOpacity>

      <View className="flex-row gap-3 mb-8">
        <TouchableOpacity
          onPress={onHistory}
          className="flex-1 py-4 rounded-2xl items-center"
          style={{ backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
          activeOpacity={0.8}
        >
          <Text className="text-base font-semibold" style={{ color: theme.colors.primary }}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSettings}
          className="flex-1 py-4 rounded-2xl items-center"
          style={{ backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
          activeOpacity={0.8}
        >
          <Text className="text-base font-semibold" style={{ color: theme.colors.primary }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-xs text-center mb-4" style={{ color: theme.colors.textMuted }}>
        Pass the phone. Share your day. Grow closer.
      </Text>
    </ScrollView>
  );
}
