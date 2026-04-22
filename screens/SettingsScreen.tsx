import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useFamilyStore } from '../stores/familyStore';
import { getDatabase, resetDatabase } from '../db/migrations';
import { theme } from '../lib/theme';

interface SettingsScreenProps {
  onBack: () => void;
  onResetFamily: () => void;
}

export function SettingsScreen({ onBack, onResetFamily }: SettingsScreenProps) {
  const { family, members, addMember, removeMember } = useFamilyStore();
  const [newMemberName, setNewMemberName] = useState('');

  const handleExport = async () => {
    const db = await getDatabase();
    const families = await db.getAllAsync('SELECT * FROM family');
    const allMembers = await db.getAllAsync('SELECT * FROM member');
    const sessions = await db.getAllAsync('SELECT * FROM session');
    const roses = await db.getAllAsync('SELECT * FROM rose');
    const thorns = await db.getAllAsync('SELECT * FROM thorn');

    const payload = JSON.stringify({ families, members: allMembers, sessions, roses, thorns }, null, 2);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync('data:application/json;base64,' + btoa(payload), {
        mimeType: 'application/json',
        dialogTitle: 'Export Rose & Thorn History',
      });
    } else {
      await Share.share({ message: payload });
    }
  };

  const handleAddMember = async () => {
    if (newMemberName.trim().length === 0) return;
    await addMember(newMemberName.trim());
    setNewMemberName('');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Everything?',
      'This will delete all family data and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            onResetFamily();
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <View className="pt-12 pb-4 px-6 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          Settings
        </Text>
      </View>

      <ScrollView className="px-6">
        {family ? (
          <>
            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Family
              </Text>
              <View
                className="p-4 rounded-2xl"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  {family.name}
                </Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Members
              </Text>
              {members.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center justify-between p-3 rounded-xl mb-2"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View className="flex-row items-center">
                    <Text className="text-lg mr-3">{member.avatar_emoji}</Text>
                    <Text className="text-base" style={{ color: theme.colors.text }}>
                      {member.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMember(member.id)}>
                    <Text className="text-lg" style={{ color: theme.colors.rose }}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleExport}
              className="py-4 rounded-2xl items-center mb-4"
              style={{ backgroundColor: theme.colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-semibold">Export History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReset}
              className="py-4 rounded-2xl items-center mb-8"
              style={{ backgroundColor: theme.colors.roseLight, borderWidth: 1, borderColor: theme.colors.rose }}
              activeOpacity={0.8}
            >
              <Text className="text-lg font-semibold" style={{ color: theme.colors.rose }}>
                Reset All Data
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text className="text-center mt-12" style={{ color: theme.colors.textMuted }}>
            No family configured.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
